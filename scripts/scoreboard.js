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

        // Calculer le classement
        const rankings = teams.map(team => ({
            ...team,
            ...scores[team.id],
            goalDifference: (scores[team.id]?.goalsFor || 0) - (scores[team.id]?.goalsAgainst || 0),
            matchesPlayed: this.calculateMatchesPlayed(team.id)
        })).sort((a, b) => {
            // Trier par points, puis différence de buts, puis buts marqués
            if (b.points !== a.points) return b.points - a.points;
            const goalDiffA = a.goalsFor - a.goalsAgainst;
            const goalDiffB = b.goalsFor - b.goalsAgainst;
            if (goalDiffB !== goalDiffA) return goalDiffB - goalDiffA;
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
                    <th>Matchs joués</th>
                    <th>Buts pour</th>
                    <th>Buts contre</th>
                    <th>Différence</th>
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
}

const scoreboardManager = new ScoreboardManager(); 