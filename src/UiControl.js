export class SideBar {
    #widthInput;
    #heightInput;

    constructor() {
        this.sideBar = document.querySelector(".side-bar");
        this.wallHeight = 2.1;
        this.wallWidth = 0.2;


        this.#heightInput = null;

        document.getElementById("showSidebarBt").addEventListener("click", this.toggleSideBar);
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

    updateSidebar(isPlanModeActive) {
        if (isPlanModeActive) {          // PlanMode
            fetch('style/component/sidebar-plan.html')
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok ' + response.statusText);
                    }
                    return response.text();
                })
                .then(data => {
                    this.sideBar.innerHTML = data;

                    this.#updateWallInputFields();

                    this.#widthInput.addEventListener("input", () => this.setWidth(this.#widthInput.value));
                    this.#heightInput.addEventListener("input", () => this.setHeight(this.#heightInput.value));

                    if (this.#widthInput) {
                        this.#widthInput.value = this.wallWidth;
                    }
                    if (this.#heightInput) {
                        this.#heightInput.value = this.wallHeight;
                    }
                })
                .catch(err => {
                    console.error('Error fetching component file:', err);
                });


        } else if (!isPlanModeActive) { // DesignMode
            this.sideBar.innerHTML = `
                <h3>Design Mode</h3>
                <button onclick="startDesign()">Start Design</button>
                <p>Current Mode: Design Mode</p>
            `;
        }
    }

    setWidth(width) {
        this.wallWidth = width;
    }

    setHeight(height) {
        this.wallHeight = height;
    }

    #updateWallInputFields() {
        this.#widthInput = document.getElementById('width');
        this.#heightInput = document.getElementById('height');
    }
}