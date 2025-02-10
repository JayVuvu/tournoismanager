class ScoreboardManager {
    constructor() {
        this.rankingsContainer = document.getElementById('rankings');
        this.init();
    }

    init() {
        this.renderRankings();
    }

    renderRankings() {
        const teams = db.getTeams();
        const scores = db.getScores();
        const tournament = db.getTournament();

        if (!teams.length) {
            this.rankingsContainer.innerHTML = '<p class="empty-state">Aucune équipe enregistrée</p>';
            return;
        }

        // Calculer le classement avec prise en compte des fautes
        const rankings = teams.map(team => ({
            ...team,
            ...scores[team.id],
            goalDifference: (scores[team.id]?.goalsFor || 0) - (scores[team.id]?.goalsAgainst || 0),
            matchesPlayed: this.calculateMatchesPlayed(team.id)
        })).sort((a, b) => {
            // D'abord par points
            if (b.points !== a.points) return b.points - a.points;
            // Puis par différence de buts
            const goalDiffA = a.goalsFor - a.goalsAgainst;
            const goalDiffB = b.goalsFor - b.goalsAgainst;
            if (goalDiffB !== goalDiffA) return goalDiffB - goalDiffA;
            // En cas d'égalité, l'équipe avec le moins de fautes est avantagée
            if (a.fouls !== b.fouls) return a.fouls - b.fouls;
            // Enfin par buts marqués
            return b.goalsFor - a.goalsFor;
        });

        // Mise à jour du podium
        document.getElementById('first-place').textContent = rankings[0]?.name || '-';
        document.getElementById('second-place').textContent = rankings[1]?.name || '-';
        document.getElementById('third-place').textContent = rankings[2]?.name || '-';

        // Créer le tableau de classement avec plus d'informations
        const table = document.createElement('table');
        table.className = 'rankings-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Position</th>
                    <th>Équipe</th>
                    <th>Points</th>
                    <th>Matchs</th>
                    <th>Buts pour</th>
                    <th>Buts contre</th>
                    <th>Différence</th>
                    <th>Fautes</th>
                </tr>
            </thead>
            <tbody>
                ${rankings.map((team, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${team.name}</td>
                        <td><strong>${team.points || 0}</strong></td>
                        <td>${team.matchesPlayed || 0}</td>
                        <td>${team.goalsFor || 0}</td>
                        <td>${team.goalsAgainst || 0}</td>
                        <td class="${team.goalDifference > 0 ? 'positive' : team.goalDifference < 0 ? 'negative' : ''}">${team.goalDifference > 0 ? '+' : ''}${team.goalDifference}</td>
                        <td class="${team.fouls > 0 ? 'negative' : ''}">${team.fouls || 0}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;

        // Afficher le système de points si un tournoi est en cours
        let pointsSystemInfo = '';
        if (tournament?.pointsSystem) {
            pointsSystemInfo = `
                <div class="points-system-info">
                    <h3>Système de points</h3>
                    <p>Victoire : ${tournament.pointsSystem.win} points</p>
                    <p>Match nul : ${tournament.pointsSystem.draw} points</p>
                    <p>Défaite : ${tournament.pointsSystem.loss} points</p>
                </div>
            `;
        }

        this.rankingsContainer.innerHTML = pointsSystemInfo;
        this.rankingsContainer.appendChild(table);
    }

    calculateMatchesPlayed(teamId) {
        const tournament = db.getTournament();
        if (!tournament) return 0;

        let count = 0;
        tournament.matches.forEach(round => {
            round.forEach(match => {
                if (match.played && (match.team1.id === teamId || match.team2.id === teamId)) {
                    count++;
                }
            });
        });
        return count;
    }

    renderTeamStats(team) {
        return `
            <div class="team-stats-card">
                <h3>${team.name}</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-value">${team.matchesPlayed}</div>
                        <div class="stat-label">Matchs joués</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${team.points}</div>
                        <div class="stat-label">Points</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${team.goalsFor}</div>
                        <div class="stat-label">Buts marqués</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${(team.goalsFor / team.matchesPlayed).toFixed(1)}</div>
                        <div class="stat-label">Moyenne/match</div>
                    </div>
                </div>
            </div>
        `;
    }

    exportResults() {
        const teams = db.getTeams();
        const scores = db.getScores();
        const tournament = db.getTournament();

        const data = {
            date: new Date().toLocaleDateString(),
            teams: teams.map(team => ({
                name: team.name,
                stats: scores[team.id],
                matches: tournament.matches.flat().filter(m => 
                    m.team1.id === team.id || m.team2.id === team.id
                ).map(m => ({
                    opponent: m.team1.id === team.id ? m.team2.name : m.team1.name,
                    score: m.team1.id === team.id ? 
                        `${m.score1}-${m.score2}` : 
                        `${m.score2}-${m.score1}`,
                    fouls: m.team1.id === team.id ? m.fouls1 : m.fouls2
                }))
            }))
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tournoi-${data.date}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

const scoreboardManager = new ScoreboardManager(); 