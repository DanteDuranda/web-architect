import * as THREE from "three";
import { Furniture } from "Furniture";

export class SideBar {
    static catalogItems = [];

    #widthInput;
    #heightInput;
    #planModeContent;
    #designModeContent;

    constructor() {

        this.sideBar = document.querySelector(".side-bar");
        this.wallHeight = 2.1;
        this.wallWidth = 0.2;
        this.isWallPlacingActive = false;

        this.#widthInput = null;
        this.#heightInput = null;

        this.#planModeContent = null;  // cached sidebar-plan.html
        this.#designModeContent = null; // cached sidebar-design.html

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

                const toggleButton = document.getElementById('toggle-wall-draw');
                if (toggleButton) {
                    toggleButton.addEventListener('click', this.#toggleWallDrawHandler.bind(this));
                }
            }
        } else {
            // load cached design mode content
            if (this.#designModeContent) {
                this.sideBar.innerHTML = this.#designModeContent;
                FurnitureCatalog.loadCatalogItems();
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
        this.#widthInput = document.getElementById('width');
        this.#heightInput = document.getElementById('height');
    }

    #toggleWallDrawHandler(event) {
        event.target.classList.toggle('active');
        this.isWallPlacingActive = event.target.classList.contains('active');

        document.dispatchEvent(new CustomEvent('wallPlacingToggled', { detail: this.isWallPlacingActive }));
    }
}

class CatalogItem {
    /**
     * Creates a new catalog item.
     * @param {string} id - Unique ID of the item (e.g., 'chair-00000').
     * @param {string} type - Type of the item (e.g., 'catalog-furniture').
     * @param {string} name - Display name of the item.
     */
    constructor(id, type, name) {
        this.catalogId = id;
        this.type = type;
        this.name = name;

        this.category = id.split('-')[0];

        this.imageSrc = `res/image/${this.category}/${id}.png`;
        this.modelPath = `res/models/${id}.fbx`;
    }

    /**
     * @returns { HTMLElement } Generated catalog item.
     */
    createElement() {
        const container = document.createElement("div");
        container.classList.add("catalog-item");
        container.id = this.catalogId;

        const button = document.createElement("button");
        button.classList.add("catalog-button");
        button.style.backgroundImage = `url(${this.imageSrc})`;
        button.setAttribute("draggable", true);

        button.addEventListener("click", () => {
            const event = new CustomEvent("addFurnitureRequested", {
                detail: { catalogItem: this }
            });
            document.dispatchEvent(event);
        });

        const label = document.createElement("p");
        label.classList.add("catalog-label");
        label.textContent = this.name;

        container.appendChild(button);
        container.appendChild(label);
        return container;
    }

    static failResponse(){
        const label = document.createElement("p");
        label.textContent = "Oops.\nWe could not fetch the furnitures!";

        return label;
    }
}

class FurnitureCatalog {
    static async loadCatalogItems() {
        const catalogContainer = document.getElementById("catalog");

        try {
            const response = await fetch("/res/catalog_Items.xml");
            const text = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, "text/xml");

            const items = xmlDoc.getElementsByTagName("CatalogItem");

            if(items.length == 0)
                throw new Error("failed to load catalog items");

            for (let item of items) {
                const id = item.getAttribute("id");
                const type = item.getAttribute("type");
                const name = item.getElementsByTagName("Name")[0].textContent;

                const catalogItem = new CatalogItem(id, type, name);
                catalogContainer.appendChild(catalogItem.createElement());
                SideBar.catalogItems.push(catalogItem); // save all items to create templates for the furniture class
            }
        } catch (error) {
            catalogContainer.appendChild(CatalogItem.failResponse());
        }
    }
}
