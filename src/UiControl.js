export class SideBar {
    #widthInput;
    #heightInput;
    #isWallPlacingActive;
    #planModeContent;
    #designModeContent;

    constructor() {
        this.sideBar = document.querySelector(".side-bar");
        this.wallHeight = 2.1;
        this.wallWidth = 0.2;

        this.#widthInput = null;
        this.#heightInput = null;
        this.#isWallPlacingActive = false;

        this.#planModeContent = null;  // cache sidebar-plan.html
        this.#designModeContent = null; // cache sidebar-design.html

        document.getElementById("showSidebarBt").addEventListener("click", this.toggleSideBar);

        // preload content files for plan and design modes
        this.#preloadSidebarContent().then(() => {
            this.updateSidebar(true);
        });
    }

    toggleSideBar() {
        const sideBar = document.querySelector(".side-bar");

        if (sideBar.classList.contains("visible")) {
            sideBar.classList.remove("visible");
            sideBar.classList.add("hidden");
        } else {
            sideBar.classList.remove("hidden");
            sideBar.classList.add("visible");
        }
    }

    async #preloadSidebarContent() {
        try {
            const planResponse = await fetch('/style/component/sidebar-plan.html');
            if (!planResponse.ok) {
                throw new Error('Failed to fetch sidebar-plan.html: ' + planResponse.statusText);
            }

            this.#planModeContent = await planResponse.text();

            const designResponse = await fetch('/style/component/sidebar-design.html');
            if (!designResponse.ok) {
                throw new Error('Failed to fetch sidebar-design.html: ' + designResponse.statusText);
            }

            this.#designModeContent = await designResponse.text();

        } catch (err) {
            console.error('Error loading sidebar content:', err);
        }
    }


    updateSidebar(isPlanModeActive) {
        if (isPlanModeActive) {
            // load cached plan mode content
            if (this.#planModeContent) {
                this.sideBar.innerHTML = this.#planModeContent;

                this.#updateWallInputFields();

                if (this.#widthInput) {
                    this.#widthInput.value = this.wallWidth;
                    this.#widthInput.addEventListener("input", () => this.setWidth(this.#widthInput.value));
                }

                if (this.#heightInput) {
                    this.#heightInput.value = this.wallHeight;
                    this.#heightInput.addEventListener("input", () => this.setHeight(this.#heightInput.value));
                }

                // toggle-wall-draw button toggle function listener
                const toggleButton = document.getElementById('toggle-wall-draw');
                if (toggleButton) {
                    toggleButton.addEventListener('click', this.#toggleWallDrawHandler.bind(this));
                }
            }
        } else {
            // load cached design mode content
            if (this.#designModeContent) {
                this.sideBar.innerHTML = this.#designModeContent;
            }
        }
    }

    setWidth(width) {
        this.wallWidth = width;
    }

    setHeight(height) {
        this.wallHeight = height;
    }

    #updateWallInputFields() {
        // Retrieve references to the wall input fields
        this.#widthInput = document.getElementById('width');
        this.#heightInput = document.getElementById('height');
    }

    #toggleWallDrawHandler(event) {
        // Toggle the active state of the button and update internal state
        event.target.classList.toggle('active');
        this.#isWallPlacingActive = event.target.classList.contains('active');
    }
}
