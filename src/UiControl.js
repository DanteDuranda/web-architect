
export class SideBar {
    static catalogItems = [];
    static catalogItemsDOMElement = new Map();

    #widthInput;
    #heightInput;
    #planModeContent;
    #designModeContent;
    constructor(transformControls) {
        this.transformControls = transformControls;

        this.sideBar = document.querySelector(".side-bar");
        this.wallHeight = 2.1;
        this.wallWidth = 0.2;
        this.isWallPlacingActive = false;

        this.#widthInput = null;
        this.#heightInput = null;

        this.chairFilterBt = null;
        this.tableFilterBt = null;

        this.officeCategoryBt = null;
        this.lroomCategoryBt = null;

        this.unit = "m";

        this.#planModeContent = null;  // cached sidebar-plan.html
        this.#designModeContent = null; // cached sidebar-design.html

        document.getElementById("showSidebarBt").addEventListener("click", this.toggleSideBar);

        this.furnitureCatalog = new FurnitureCatalog();

        this.handleTransformButtons(transformControls);

        // preload content files for plan and design modes
        this.#preloadSidebarContent().then(() => {
            this.updateSidebar(true);
        });
    }


    toggleSideBar() {
        const sideBar = document.querySelector(".side-bar");
        const transformModes = document.querySelector('.control-groups');

        if (sideBar.classList.contains("visible")) {
            sideBar.classList.remove("visible");
            sideBar.classList.add("hidden");
            transformModes.classList.remove('with-sidebar');
        } else {
            sideBar.classList.remove("hidden");
            sideBar.classList.add("visible");
            transformModes.classList.add('with-sidebar');
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

                this.handleUnitRadioButtons();
                this.handleAddWinDoorFromCatalog(this.transformControls);
            }
        } else {
            // load cached design mode content
            if (this.#designModeContent) {
                this.sideBar.innerHTML = this.#designModeContent;
                this.furnitureCatalog.loadCatalogItems();

                this.sideBar.addEventListener('click', (event) => {
                    if (event.target && event.target.id === 'chair-type-bt') {
                        this.furnitureCatalog.setFilters(null, 'chair', event.target);
                    }
                    if (event.target && event.target.id === 'table-type-bt') {
                        this.furnitureCatalog.setFilters(null, 'table', event.target);
                    }
                    if (event.target && event.target.id === 'office-category-bt') {
                        this.furnitureCatalog.setFilters('office', null, event.target);
                    }
                    if (event.target && event.target.id === 'lroom-category-bt') {
                        this.furnitureCatalog.setFilters('lroom', null, event.target);
                    }
                });
            }
        }
    }


    handleUnitRadioButtons() {
        const radioToCheck = document.querySelector(`input[name="unit"][value="${this.unit}"]`);
        if (radioToCheck) {
            radioToCheck.checked = true;
        }

        document.querySelectorAll('input[name="unit"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.unit = document.querySelector('input[name="unit"]:checked').value;
            });
        });
    }

    handleTransformButtons(wTransformControls) {
        const transformGroup = document.querySelector('.transform-modes');

        transformGroup?.addEventListener('click', (e) => {
            const button = e.target.closest('.transform-button');
            if (!button || !transformGroup.contains(button)) return;

            transformGroup.querySelectorAll('.transform-button').forEach(btn => {
                btn.classList.remove('active');
            });

            button.classList.add('active');
            const mode = button.dataset.mode;
            wTransformControls.changeTransformModes(mode);
        });

        const deleteButton = document.getElementById('delete-button');
        deleteButton.addEventListener('click', (e) => {
            wTransformControls.deleteObject();
        })
    }

    handleAddWinDoorFromCatalog(wTransformControls) {
        const catalogSection = document.querySelector('.catalog-section');

        catalogSection?.addEventListener('click', (e) => {
            const button = e.target.closest('.catalog-button');
            if (!button || !catalogSection.contains(button)) return;

            const selectedWall = wTransformControls.object;

            if (!selectedWall || selectedWall.name !== "Wall") {
                console.warn("No wall selected to attach a WinDoor.");
                return;
            }

            const type = button.dataset.type || 'plain';

            selectedWall.addWindoor(type);
        });
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

export class CatalogItem {
    /**
     * Creates a new catalog item.
     * @param {string} id - Unique ID of the item (e.g., 'chair-00000').
     * @param {string} type - Type of the item (e.g., 'catalog-furniture').
     * @param {string} name - Display name of the item.
     * @param roomType
     * @param gizmoType
     * @param resizable
     */
    constructor(id, type, name, roomType, gizmoType, resizable) {
        this.catalogId = id;
        this.type = type;
        this.name = name;
        this.roomType = roomType;
        this.gizmoType = gizmoType;
        this.resizable = resizable;

        this.category = id.split('-')[0];
        this.imageSrc = `res/image/${this.category}/${id}.png`;
        this.modelPath = `res/models/${id}.fbx`;
    }
}

class Catalog {
    async loadCatalogItems() {
        throw new Error("Method 'loadCatalogItems' must be implemented.");
    }

    filterItems() {
        throw new Error("Method 'filterItems' must be implemented.");
    }

    setFilters(roomTypeFilter, furnitureTypeFilter, clickedButton) {
        throw new Error("Method 'setFilters' must be implemented.");
    }

    toggleActive(clickedButton, buttonGroup) {
        throw new Error("Method 'toggleActive' must be implemented.");
    }

    createElement(catalogItem) {
        throw new Error("Method 'createElement' must be implemented.");
    }

    failResponse() {
        throw new Error("Method 'failResponse' must be implemented.");
    }
}

class FurnitureCatalog extends Catalog {
    static roomTypeFilter = null;
    static furnitureTypeFilter = null;

    async loadCatalogItems() {
        const catalogContainer = document.getElementById("catalog");

        try {
            const response = await fetch("/res/furniture_catalog_Items.xml");
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
                const roomType = item.getElementsByTagName("RoomType")[0].textContent;
                const gizmoType = item.getElementsByTagName("GizmoType")[0].textContent;
                const resizableTag = item.getElementsByTagName("Resizable")[0];
                const resizable = resizableTag.textContent.trim() === "true";

                const catalogItem = new CatalogItem(id, type, name, roomType, gizmoType, resizable);
                const catalogItemDomElement = this.#createElement(catalogItem);
                catalogContainer.appendChild(catalogItemDomElement);

                /*save items*/
                SideBar.catalogItems.push(catalogItem);
                SideBar.catalogItemsDOMElement.set(catalogItem.catalogId, catalogItemDomElement);
            }
        } catch (error) {
            catalogContainer.appendChild(this.#failResponse());
        }
    }

    filterItems() {
        const catalogContainer = document.getElementById("catalog");
        const filteredDomElementsToAdd = [];

        for (const catalogItem of SideBar.catalogItems) {
            let isInFilters = true;

            if (this.roomTypeFilter && catalogItem.roomType !== this.roomTypeFilter) {
                isInFilters = false;
            }

            if (this.furnitureTypeFilter && catalogItem.type !== this.furnitureTypeFilter) {
                isInFilters = false;
            }

            if (isInFilters) {
                filteredDomElementsToAdd.push(SideBar.catalogItemsDOMElement.get(catalogItem.catalogId));
            }
        }

        while (catalogContainer.firstChild) {
            catalogContainer.removeChild(catalogContainer.firstChild);
        }

        for (const domCatalogItem of filteredDomElementsToAdd) {
            catalogContainer.appendChild(domCatalogItem);
        }
    }

    setFilters(roomTypeFilter, furnitureTypeFilter, clickedButton) {
        const roomButtons = document.querySelectorAll("#room-category-bt-container .room-category-button");
        const furnitureButtons = document.querySelectorAll("#furniture-category-bt-container .room-category-button");

        let needToUpdateCatalog = false;

        if(roomTypeFilter) {
            this.roomTypeFilter = roomTypeFilter;
            needToUpdateCatalog = true;
            this.toggleActive(clickedButton, roomButtons);
        } else if (furnitureTypeFilter) {
            this.furnitureTypeFilter = furnitureTypeFilter;
            needToUpdateCatalog = true;
            this.toggleActive(clickedButton, furnitureButtons);
        }

        if(needToUpdateCatalog)
            this.filterItems();
    }

    toggleActive(clickedButton, buttonGroup) {
        buttonGroup.forEach(button => {
            if (button !== clickedButton) {
                button.classList.remove("active");
            }
        });
        clickedButton.classList.add("active");
    }

    /**
     * @returns { HTMLElement } Generated catalog item.
     */
    #createElement(catalogItem) {
        const container = document.createElement("div");
        container.classList.add("catalog-item");
        container.id = catalogItem.catalogId;

        const button = document.createElement("button");
        button.classList.add("catalog-button");
        button.style.backgroundImage = `url(${catalogItem.imageSrc})`;
        button.setAttribute("draggable", true);

        button.addEventListener("click", () => {
            const event = new CustomEvent("addFurnitureRequested", {
                detail: { catalogItem: catalogItem }
            });
            document.dispatchEvent(event);
        });

        const label = document.createElement("p");
        label.classList.add("catalog-label");
        label.textContent = catalogItem.name;

        container.appendChild(button);
        container.appendChild(label);
        return container;
    }

    #failResponse(){
        const label = document.createElement("p");
        label.textContent = "Oops.\nWe could not fetch the furnitures!";

        return label;
    }
}

class WinDoorCatalog extends Catalog { // maybe DEPRECATED
    async loadCatalogItems() {
        throw new Error("");
    }

    filterItems() {
        throw new Error("");
    }

    setFilters(roomTypeFilter, furnitureTypeFilter, clickedButton) {
        throw new Error("");
    }

    toggleActive(clickedButton, buttonGroup) {
        throw new Error("");
    }

    createElement(catalogItem) {
        throw new Error("");
    }

    failResponse() {
        throw new Error("");
    }
}
