class Database {
    constructor() {
        this.db = window.localStorage;
    }

    saveTeams(teams) {
        this.db.setItem('teams', JSON.stringify(teams));
    }

    getTeams() {
        const teams = this.db.getItem('teams');
        return teams ? JSON.parse(teams) : [];
    }

    saveTournament(tournament) {
        this.db.setItem('tournament', JSON.stringify(tournament));
    }

    getTournament() {
        const tournament = this.db.getItem('tournament');
        return tournament ? JSON.parse(tournament) : null;
    }

    saveScores(scores) {
        this.db.setItem('scores', JSON.stringify(scores));
    }

    getScores() {
        const scores = this.db.getItem('scores');
        return scores ? JSON.parse(scores) : {};
    }
}

const db = new Database(); 