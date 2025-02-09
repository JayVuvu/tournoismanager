class App {
    constructor() {
        this.navItems = document.querySelectorAll('.nav-item');
        this.views = document.querySelectorAll('.view');
        this.init();
    }

    init() {
        this.navItems.forEach(item => {
            item.addEventListener('click', () => {
                this.switchView(item.dataset.view);
            });
        });
    }

    switchView(viewId) {
        // Mettre à jour la navigation
        this.navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.view === viewId);
        });

        // Afficher la vue correspondante
        this.views.forEach(view => {
            view.classList.toggle('active', view.id === `${viewId}-view`);
        });

        // Mettre à jour les données si nécessaire
        if (viewId === 'scoreboard') {
            scoreboardManager.renderRankings();
        }
    }
}

const app = new App(); 