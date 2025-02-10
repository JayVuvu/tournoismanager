class TournamentManager {
    constructor() {
        this.tournament = db.getTournament();
        this.init();
    }

    init() {
        document.getElementById('tournament-config').addEventListener('submit', (e) => {
            e.preventDefault();
            this.generateTournament();
        });
        
        this.updateStatus();
        if (this.tournament) {
            this.renderSchedule();
        }

        this.initKeyboardShortcuts();
        this.initConfigPreview();
    }

    initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveCurrentMatch();
            }
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                this.undoLastAction();
            }
        });
    }

    initConfigPreview() {
        const inputs = document.querySelectorAll('#tournament-config input, #tournament-config select');
        inputs.forEach(input => {
            input.addEventListener('change', () => this.updateConfigPreview());
        });
        this.updateConfigPreview();
    }

    updateConfigPreview() {
        const courts = document.getElementById('courts-number').value;
        const startTime = document.getElementById('start-time').value;
        const endTime = document.getElementById('end-time').value;
        const delaySelect = document.getElementById('round-delay');
        const delayText = delaySelect.options[delaySelect.selectedIndex].text;
        const win = document.getElementById('win-points').value;
        const draw = document.getElementById('draw-points').value;
        const loss = document.getElementById('loss-points').value;

        const preview = document.getElementById('config-preview');
        preview.innerHTML = `
            <div class="preview-grid">
                <div class="preview-section">
                    <div class="preview-label">Terrains</div>
                    <div class="preview-value">${courts} terrain${courts > 1 ? 's' : ''}</div>
                </div>
                <div class="preview-section">
                    <div class="preview-label">Horaires</div>
                    <div class="preview-value">${startTime} - ${endTime}</div>
                </div>
                <div class="preview-section">
                    <div class="preview-label">Pause</div>
                    <div class="preview-value">${delayText}</div>
                </div>
                <div class="preview-section points-preview">
                    <div class="preview-label">Points</div>
                    <div class="preview-value">
                        <span class="point-item win">Victoire : ${win}</span>
                        <span class="point-item draw">Nul : ${draw}</span>
                        <span class="point-item loss">Défaite : ${loss}</span>
                    </div>
                </div>
            </div>
        `;
    }

    updateStatus() {
        const statusContainer = document.getElementById('tournament-status');
        if (!statusContainer) return;

        if (!this.tournament) {
            statusContainer.innerHTML = `
                <div class="info-message">
                    Aucun tournoi n'a été configuré.
                </div>
            `;
            return;
        }

        statusContainer.innerHTML = `
            <div class="tournament-info">
                <h3>Tournoi en cours</h3>
                <p>Durée des matchs : ${this.tournament.matchDuration} minutes</p>
                <p>Nombre de terrains : ${this.tournament.courts} ${this.tournament.courts > 1 ? 'terrains' : 'terrain'}</p>
                <p>Points : ${this.tournament.pointsSystem.win} (V) / 
                          ${this.tournament.pointsSystem.draw} (N) / 
                          ${this.tournament.pointsSystem.loss} (D)</p>
                <button class="btn-danger" onclick="tournamentManager.resetTournament()">
                    Réinitialiser le tournoi
                </button>
            </div>
        `;
    }

    resetTournament() {
        const confirmation = confirm(
            'Attention :\n\n' +
            '- Le tournoi en cours sera supprimé\n' +
            '- Tous les scores seront réinitialisés\n' +
            '- Les équipes seront conservées\n\n' +
            'Êtes-vous sûr de vouloir réinitialiser le tournoi ?'
        );
        
        if (confirmation) {
            this.tournament = null;
            db.saveTournament(null);
            
            // Réinitialiser uniquement les scores, pas les équipes
            const teams = db.getTeams();
            const newScores = {};
            teams.forEach(team => {
                newScores[team.id] = {
                    points: 0,
                    goalsFor: 0,
                    goalsAgainst: 0
                };
            });
            db.saveScores(newScores);
            
            this.updateStatus();
            this.renderSchedule();
            scoreboardManager.renderRankings();
            
            alert(
                'Le tournoi a été réinitialisé avec succès :\n\n' +
                '- Les matchs ont été supprimés\n' +
                '- Les scores ont été réinitialisés\n' +
                '- Les équipes ont été conservées'
            );
            
            app.switchView('tournament-config');
        }
    }

    showProgress() {
        const overlay = document.createElement('div');
        overlay.className = 'progress-overlay';
        overlay.innerHTML = `
            <div class="progress-container">
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
                <div class="progress-text">Configuration en cours...</div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Démarrer l'animation
        setTimeout(() => {
            const fill = overlay.querySelector('.progress-fill');
            fill.style.width = '100%';
        }, 100);

        return overlay;
    }

    generateTournament() {
        const overlay = this.showProgress();
        const progressText = overlay.querySelector('.progress-text');
        
        try {
            const courts = parseInt(document.getElementById('courts-number').value);
            const startTime = document.getElementById('start-time').value;
            const endTime = document.getElementById('end-time').value;
            const roundDelay = parseFloat(document.getElementById('round-delay').value);
            const teams = db.getTeams();
            
            if (teams.length < 2) {
                throw new Error('Il faut au moins 2 équipes pour générer un tournoi');
            }

            // Calculer le temps total disponible en minutes
            const totalMinutes = this.calculateTotalMinutes(startTime, endTime);
            if (totalMinutes <= 0) {
                throw new Error('L\'heure de fin doit être après l\'heure de début');
            }

            const pointsSystem = {
                win: parseInt(document.getElementById('win-points').value),
                draw: parseInt(document.getElementById('draw-points').value),
                loss: parseInt(document.getElementById('loss-points').value)
            };

            const matches = this.generateAllMatches(teams);
            const totalMatches = matches.length;
            const matchDuration = Math.floor((totalMinutes / totalMatches) * courts);

            if (matchDuration < 5) {
                throw new Error('Le temps disponible est insuffisant pour le nombre de matchs à jouer');
            }

            const organizedMatches = this.organizeMatchesInRounds(matches, courts);

            this.tournament = {
                matches: organizedMatches,
                matchDuration,
                courts,
                pointsSystem,
                startTime,
                endTime,
                roundDelay
            };

            db.saveTournament(this.tournament);
            this.renderSchedule();
            this.updateStatus();

            // Animation de fin
            setTimeout(() => {
                progressText.textContent = 'Configuration terminée !';
                progressText.classList.add('show');
                
                setTimeout(() => {
                    overlay.style.opacity = '0';
                    setTimeout(() => {
                        overlay.remove();
                        app.switchView('matches');
                    }, 300);
                }, 800);
            }, 800);

        } catch (error) {
            overlay.remove();
            alert(error.message);
        }
    }

    calculateTotalMinutes(startTime, endTime) {
        const [startHours, startMinutes] = startTime.split(':').map(Number);
        const [endHours, endMinutes] = endTime.split(':').map(Number);
        return (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
    }

    generateAllMatches(teams) {
        const matches = [];
        const teamsCount = teams.length;
        
        // Créer un tableau de tous les matchs possibles dans un ordre optimal
        const schedule = this.generateRoundRobinSchedule(teams);
        
        // Convertir le planning en matchs
        schedule.forEach((round, roundIndex) => {
            round.forEach(pairing => {
                matches.push({
                    id: `match-${pairing[0].id}-${pairing[1].id}`,
                    team1: pairing[0],
                    team2: pairing[1],
                    played: false,
                    score1: null,
                    score2: null,
                    roundIndex: roundIndex
                });
            });
        });

        return matches;
    }

    generateRoundRobinSchedule(teams) {
        const schedule = [];
        const n = teams.length;
        
        // Si nombre impair d'équipes, ajouter une équipe "bye"
        const teamsList = [...teams];
        if (n % 2 === 1) {
            teamsList.push(null);
        }
        
        const numRounds = teamsList.length - 1;
        const numMatchesPerRound = teamsList.length / 2;

        // Algorithme de Berger pour le Round-Robin
        for (let round = 0; round < numRounds; round++) {
            const roundMatches = [];
            
            for (let match = 0; match < numMatchesPerRound; match++) {
                const home = (round + match) % (teamsList.length - 1);
                const away = (teamsList.length - 1 - match + round) % (teamsList.length - 1);
                
                // Le dernier team reste fixe, les autres tournent
                if (match === 0) {
                    roundMatches.push([
                        teamsList[home],
                        teamsList[teamsList.length - 1]
                    ]);
                } else {
                    roundMatches.push([
                        teamsList[home],
                        teamsList[away]
                    ]);
                }
            }
            
            // Filtrer les matchs impliquant l'équipe "bye" si nombre impair
            const validMatches = roundMatches.filter(match => 
                match[0] !== null && match[1] !== null
            );
            
            if (validMatches.length > 0) {
                schedule.push(validMatches);
            }
        }
        
        return schedule;
    }

    renderSchedule() {
        const scheduleContainer = document.getElementById('matches-schedule');
        if (!scheduleContainer) return;

        if (!this.tournament) {
            scheduleContainer.innerHTML = '<div class="info-message">Aucun tournoi en cours</div>';
            return;
        }

        scheduleContainer.innerHTML = `
            <h2>Planning des matchs</h2>
            <div class="tournament-info">
                <p>Durée des matchs : ${this.tournament.matchDuration} minutes</p>
                <p>Nombre de terrains : ${this.tournament.courts}</p>
            </div>
        `;

        const scheduleGrid = document.createElement('div');
        scheduleGrid.className = 'schedule-grid';

        this.tournament.matches.forEach((round, roundIndex) => {
            const roundDiv = document.createElement('div');
            roundDiv.className = 'round';
            
            // Vérifier si c'est le round en cours
            const isCurrentRound = this.isCurrentRound(roundIndex);
            if (isCurrentRound) {
                roundDiv.classList.add('current-round');
            }
            
            const roundStartTime = this.calculateRoundStartTime(roundIndex);
            const roundEndTime = this.calculateRoundEndTime(roundIndex);
            
            roundDiv.innerHTML = `
                <h3>Tour ${roundIndex + 1}</h3>
                <div class="round-time">
                    ${roundStartTime} - ${roundEndTime}
                    ${this.tournament.roundDelay > 0 ? 
                        `<span class="round-delay">(${this.tournament.roundDelay < 1 ? '30 sec' : 
                            this.tournament.roundDelay + ' min'} de pause)</span>` : 
                        ''}
                </div>
            `;

            const matchesContainer = document.createElement('div');
            matchesContainer.className = 'matches-container';

            round.forEach((match, courtIndex) => {
                const matchDiv = document.createElement('div');
                matchDiv.className = 'match';
                matchDiv.innerHTML = this.createMatchHTML(match, courtIndex, roundStartTime);
                matchesContainer.appendChild(matchDiv);
            });

            roundDiv.appendChild(matchesContainer);
            scheduleGrid.appendChild(roundDiv);
        });

        scheduleContainer.appendChild(scheduleGrid);
    }

    isCurrentRound(roundIndex) {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        
        const roundStartTime = this.getRoundMinutes(this.calculateRoundStartTime(roundIndex));
        const roundEndTime = this.getRoundMinutes(this.calculateRoundEndTime(roundIndex));
        
        return currentTime >= roundStartTime && currentTime <= roundEndTime;
    }

    getRoundMinutes(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours * 60 + minutes;
    }

    createMatchHTML(match, courtIndex, roundStartTime) {
        const timer = `
            <div class="match-timer" id="timer-${match.id}">
                ${this.tournament.matchDuration}:00
            </div>
            <div class="timer-controls">
                <button class="btn-timer start" onclick="tournamentManager.startTimer('${match.id}')">
                    Démarrer
                </button>
                <button class="btn-timer stop" onclick="tournamentManager.stopTimer('${match.id}')" style="display:none">
                    Arrêter
                </button>
                <button class="btn-timer pause" onclick="tournamentManager.pauseTimer('${match.id}')" style="display:none">
                    Pause
                </button>
                <button class="btn-timer resume" onclick="tournamentManager.resumeTimer('${match.id}')" style="display:none">
                    Reprendre
                </button>
            </div>
        `;

        const toggleButton = match.played ? `
            <button class="toggle-match" onclick="event.stopPropagation(); tournamentManager.toggleMatch('${match.id}')">
                ▼
            </button>
        ` : '';

        const matchSummary = match.played ? `
            <div class="match-summary">
                ${match.team1.name} ${match.score1} - ${match.score2} ${match.team2.name}
            </div>
        ` : '';

        return `
            <div class="match${match.played ? ' match-played minimized' : ''}" 
                 ${match.played ? `onclick="tournamentManager.toggleMatch('${match.id}')"` : ''}>
                ${toggleButton}
                <div class="match-header">
                    Terrain ${courtIndex + 1}
                    <div class="match-time">${roundStartTime}</div>
                </div>
                ${matchSummary}
                ${!match.played ? timer : ''}
                <div class="match-teams">
                    <div class="team">
                        <span class="team-name">${match.team1.name}</span>
                        <div class="team-inputs">
                            <input type="number" 
                                   class="score-input" 
                                   data-match="${match.id}" 
                                   data-team="1" 
                                   value="${match.score1 ?? ''}"
                                   onclick="event.stopPropagation()">
                            <input type="number" 
                                   class="fouls-input" 
                                   data-match="${match.id}" 
                                   data-team="1" 
                                   data-type="fouls"
                                   placeholder="Fautes"
                                   value="${match.fouls1 ?? ''}"
                                   onclick="event.stopPropagation()">
                        </div>
                    </div>
                    <div class="match-versus">VS</div>
                    <div class="team">
                        <span class="team-name">${match.team2.name}</span>
                        <div class="team-inputs">
                            <input type="number" 
                                   class="score-input" 
                                   data-match="${match.id}" 
                                   data-team="2" 
                                   value="${match.score2 ?? ''}"
                                   onclick="event.stopPropagation()">
                            <input type="number" 
                                   class="fouls-input" 
                                   data-match="${match.id}" 
                                   data-team="2" 
                                   data-type="fouls"
                                   placeholder="Fautes"
                                   value="${match.fouls2 ?? ''}"
                                   onclick="event.stopPropagation()">
                        </div>
                    </div>
                </div>
                <div class="match-actions">
                    <button class="btn-primary btn-validate" 
                            onclick="event.stopPropagation(); tournamentManager.saveMatchScore('${match.id}')">
                        ${match.played ? 'Modifier le score' : 'Valider'}
                    </button>
                    ${match.played ? 
                        `<div class="match-status">Match joué</div>` : 
                        ''}
                </div>
            </div>
        `;
    }

    startTimer(matchId) {
        const timerElement = document.getElementById(`timer-${matchId}`);
        const startBtn = timerElement.parentElement.querySelector('.start');
        const stopBtn = timerElement.parentElement.querySelector('.stop');
        const pauseBtn = timerElement.parentElement.querySelector('.pause');
        
        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';
        pauseBtn.style.display = 'inline-block';
        
        this.timers = this.timers || {};
        this.timers[matchId] = {
            timeLeft: this.tournament.matchDuration * 60,
            interval: null
        };
        
        timerElement.classList.add('running');
        
        this.startInterval(matchId);
    }

    startInterval(matchId) {
        const timerElement = document.getElementById(`timer-${matchId}`);
        
        this.timers[matchId].interval = setInterval(() => {
            this.timers[matchId].timeLeft--;
            const timeLeft = this.timers[matchId].timeLeft;
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            
            timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            if (timeLeft <= 300) {
                timerElement.classList.add('warning');
            }
            if (timeLeft <= 60) {
                timerElement.classList.add('ending');
            }
            if (timeLeft <= 0) {
                this.stopTimer(matchId);
            }
        }, 1000);
    }

    pauseTimer(matchId) {
        if (this.timers && this.timers[matchId]) {
            clearInterval(this.timers[matchId].interval);
            
            const timerElement = document.getElementById(`timer-${matchId}`);
            const pauseBtn = timerElement.parentElement.querySelector('.pause');
            const resumeBtn = timerElement.parentElement.querySelector('.resume');
            
            pauseBtn.style.display = 'none';
            resumeBtn.style.display = 'inline-block';
            timerElement.classList.add('paused');
        }
    }

    resumeTimer(matchId) {
        if (this.timers && this.timers[matchId]) {
            const timerElement = document.getElementById(`timer-${matchId}`);
            const pauseBtn = timerElement.parentElement.querySelector('.pause');
            const resumeBtn = timerElement.parentElement.querySelector('.resume');
            
            pauseBtn.style.display = 'inline-block';
            resumeBtn.style.display = 'none';
            timerElement.classList.remove('paused');
            
            this.startInterval(matchId);
        }
    }

    stopTimer(matchId) {
        if (this.timers && this.timers[matchId]) {
            clearInterval(this.timers[matchId].interval);
            delete this.timers[matchId];
            
            const timerElement = document.getElementById(`timer-${matchId}`);
            const startBtn = timerElement.parentElement.querySelector('.start');
            const stopBtn = timerElement.parentElement.querySelector('.stop');
            const pauseBtn = timerElement.parentElement.querySelector('.pause');
            const resumeBtn = timerElement.parentElement.querySelector('.resume');
            
            startBtn.style.display = 'inline-block';
            stopBtn.style.display = 'none';
            pauseBtn.style.display = 'none';
            resumeBtn.style.display = 'none';
            timerElement.classList.remove('running', 'paused');
        }
    }

    calculateRoundStartTime(roundIndex) {
        const [startHours, startMinutes] = this.tournament.startTime.split(':').map(Number);
        const totalMinutes = roundIndex * (this.tournament.matchDuration + this.tournament.roundDelay);
        
        // Calculer les heures et minutes totales
        let totalHours = startHours + Math.floor((startMinutes + totalMinutes) / 60);
        let finalMinutes = (startMinutes + totalMinutes) % 60;
        
        return `${totalHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;
    }

    calculateRoundEndTime(roundIndex) {
        const [startHours, startMinutes] = this.tournament.startTime.split(':').map(Number);
        const totalMinutes = (roundIndex * (this.tournament.matchDuration + this.tournament.roundDelay)) + this.tournament.matchDuration;
        
        // Calculer les heures et minutes totales
        let totalHours = startHours + Math.floor((startMinutes + totalMinutes) / 60);
        let finalMinutes = (startMinutes + totalMinutes) % 60;
        
        return `${totalHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;
    }

    saveMatchScore(matchId) {
        const confirmMessage = this.tournament.matches.some(round => 
            round.some(match => match.id === matchId && match.played)
        ) ? 'Voulez-vous vraiment modifier le score de ce match ?' : null;

        if (confirmMessage && !confirm(confirmMessage)) {
            return;
        }

        let matchFound = false;
        this.tournament.matches.forEach((round, roundIndex) => {
            round.forEach(match => {
                if (match.id === matchId) {
                    matchFound = true;
                    const score1Input = document.querySelector(`input[data-match="${matchId}"][data-team="1"]:not([data-type="fouls"])`);
                    const score2Input = document.querySelector(`input[data-match="${matchId}"][data-team="2"]:not([data-type="fouls"])`);
                    const fouls1Input = document.querySelector(`input[data-match="${matchId}"][data-team="1"][data-type="fouls"]`);
                    const fouls2Input = document.querySelector(`input[data-match="${matchId}"][data-team="2"][data-type="fouls"]`);
                    
                    const score1 = parseInt(score1Input.value);
                    const score2 = parseInt(score2Input.value);
                    const fouls1 = parseInt(fouls1Input.value) || 0;
                    const fouls2 = parseInt(fouls2Input.value) || 0;

                    if (isNaN(score1) || isNaN(score2) || score1 < 0 || score2 < 0) {
                        alert('Veuillez entrer des scores valides (nombres positifs)');
                        return;
                    }

                    // Si le match était déjà joué, soustraire les anciens scores des statistiques
                    if (match.played) {
                        this.removeTeamStats(match);
                    }

                    match.score1 = score1;
                    match.score2 = score2;
                    match.fouls1 = fouls1;
                    match.fouls2 = fouls2;
                    match.played = true;

                    this.updateTeamStats(match);
                    alert(`Score ${match.played ? 'modifié' : 'enregistré'} : ${match.team1.name} ${score1} - ${score2} ${match.team2.name}`);
                }
            });
        });

        if (matchFound) {
            db.saveTournament(this.tournament);
            this.renderSchedule();
            scoreboardManager.renderRankings();
        }
    }

    removeTeamStats(match) {
        const scores = db.getScores() || {};
        const pointsSystem = this.tournament.pointsSystem;

        // Soustraire les buts et les fautes
        scores[match.team1.id].goalsFor -= match.score1;
        scores[match.team1.id].goalsAgainst -= match.score2;
        scores[match.team1.id].fouls -= match.fouls1;
        scores[match.team2.id].goalsFor -= match.score2;
        scores[match.team2.id].goalsAgainst -= match.score1;
        scores[match.team2.id].fouls -= match.fouls2;

        // Soustraire les points
        if (match.score1 > match.score2) {
            scores[match.team1.id].points -= pointsSystem.win;
            scores[match.team2.id].points -= pointsSystem.loss;
        } else if (match.score1 < match.score2) {
            scores[match.team2.id].points -= pointsSystem.win;
            scores[match.team1.id].points -= pointsSystem.loss;
        } else {
            scores[match.team1.id].points -= pointsSystem.draw;
            scores[match.team2.id].points -= pointsSystem.draw;
        }

        db.saveScores(scores);
    }

    updateTeamStats(match) {
        const scores = db.getScores() || {};
        const pointsSystem = this.tournament.pointsSystem;

        // Initialiser les statistiques si nécessaire
        if (!scores[match.team1.id]) {
            scores[match.team1.id] = { points: 0, goalsFor: 0, goalsAgainst: 0, fouls: 0 };
        }
        if (!scores[match.team2.id]) {
            scores[match.team2.id] = { points: 0, goalsFor: 0, goalsAgainst: 0, fouls: 0 };
        }

        // Mettre à jour les buts et les fautes
        scores[match.team1.id].goalsFor += match.score1;
        scores[match.team1.id].goalsAgainst += match.score2;
        scores[match.team1.id].fouls += match.fouls1;
        scores[match.team2.id].goalsFor += match.score2;
        scores[match.team2.id].goalsAgainst += match.score1;
        scores[match.team2.id].fouls += match.fouls2;

        // Attribution des points selon le système configuré
        if (match.score1 > match.score2) {
            scores[match.team1.id].points += pointsSystem.win;
            scores[match.team2.id].points += pointsSystem.loss;
        } else if (match.score1 < match.score2) {
            scores[match.team2.id].points += pointsSystem.win;
            scores[match.team1.id].points += pointsSystem.loss;
        } else {
            scores[match.team1.id].points += pointsSystem.draw;
            scores[match.team2.id].points += pointsSystem.draw;
        }

        db.saveScores(scores);
    }

    organizeMatchesInRounds(matches, courts) {
        const rounds = [];
        let currentRound = [];
        let matchIndex = 0;
        
        // Organiser les matchs par rounds en respectant le nombre de terrains
        while (matchIndex < matches.length) {
            if (currentRound.length < courts) {
                currentRound.push(matches[matchIndex]);
                matchIndex++;
            } else {
                rounds.push(currentRound);
                currentRound = [];
            }
        }
        
        // Ajouter le dernier round s'il n'est pas vide
        if (currentRound.length > 0) {
            rounds.push(currentRound);
        }

        return rounds;
    }

    toggleMatch(matchId) {
        const matchElement = document.querySelector(`.match[onclick*="${matchId}"]`);
        if (matchElement) {
            matchElement.classList.toggle('minimized');
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }, 100);
    }
}

const tournamentManager = new TournamentManager(); 