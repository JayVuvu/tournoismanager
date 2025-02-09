class TeamManager {
    constructor() {
        this.teams = db.getTeams();
        this.teamForm = document.getElementById('team-form');
        this.teamsList = document.getElementById('teams-list');
        this.init();
    }

    init() {
        this.teamForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTeam();
        });
        this.renderTeams();
    }

    addTeam() {
        const teamNameInput = document.getElementById('team-name');
        const teamName = teamNameInput.value.trim();
        
        if (teamName) {
            this.teams.push({
                id: Date.now(),
                name: teamName,
                points: 0,
                goalsFor: 0,
                goalsAgainst: 0
            });
            
            db.saveTeams(this.teams);
            this.renderTeams();
            teamNameInput.value = '';
        }
    }

    removeTeam(teamId) {
        this.teams = this.teams.filter(team => team.id !== teamId);
        db.saveTeams(this.teams);
        this.renderTeams();
    }

    renderTeams() {
        this.teamsList.innerHTML = '';
        
        if (this.teams.length === 0) {
            this.teamsList.innerHTML = '<p>Aucune équipe ajoutée</p>';
            return;
        }

        const ul = document.createElement('ul');
        ul.className = 'teams-list';
        
        this.teams.forEach(team => {
            const li = document.createElement('li');
            li.className = 'team-item';
            li.innerHTML = `
                <span>${team.name}</span>
                <button class="btn-delete" onclick="teamManager.removeTeam(${team.id})">
                    Supprimer
                </button>
            `;
            ul.appendChild(li);
        });

        this.teamsList.appendChild(ul);
    }
}

const teamManager = new TeamManager(); 