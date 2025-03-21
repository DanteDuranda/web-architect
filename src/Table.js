import * as THREE from 'three';

class Table extends THREE.Group {
    constructor() {
        super();

        let tableWidth = 2;
        let tableDepth = 1;
        let legHeight = 0.8;
        let legWidth = 0.05;

        this.legWidth = legWidth;
        this.legHeight = legHeight;

        this.userData = {type:"table", smartResize: true};

        // tabletop
        const tabletop = this.createMeshFrom(
            new THREE.BoxGeometry(tableWidth, 0.1, tableDepth),
            new THREE.MeshBasicMaterial({ color: 0x8B4513 })
        );

        tabletop.position.y = legHeight;
        this.tabletop = tabletop;
        this.add(this.tabletop);

        // legs
        this.legs = [];

        const positions = this.calculateLegPositions(tableWidth, tableDepth);
        positions.forEach(pos => {
            const leg = this.createMeshFrom(
                new THREE.BoxGeometry(this.legWidth, this.legHeight, this.legWidth),
                new THREE.MeshBasicMaterial({ color: 0x4B3621 }) // Darker brown color
            );
            leg.position.set(...pos); // Set leg position
            this.add(leg); // Add each leg directly to this (the group)
            this.legs.push(leg); // Keep track of the legs
        });
    }

    createMeshFrom(geometry, material) {
        return new THREE.Mesh(geometry, material);
    }

    calculateLegPositions(tableWidth, tableDepth) {
        const legOffset = 0.08; // leg indent level from the edges
        return [
            [-tableWidth / 2 + this.legWidth / 2 + legOffset, this.legHeight / 2, tableDepth / 2 - this.legWidth / 2 - legOffset],  // front-left
            [tableWidth / 2 - this.legWidth / 2 - legOffset, this.legHeight / 2, tableDepth / 2 - this.legWidth / 2 - legOffset],   // front-right
            [-tableWidth / 2 + this.legWidth / 2 + legOffset, this.legHeight / 2, -tableDepth / 2 + this.legWidth / 2 + legOffset], // back-left
            [tableWidth / 2 - this.legWidth / 2 - legOffset, this.legHeight / 2, -tableDepth / 2 + this.legWidth / 2 + legOffset]   // back-right
        ];
    }

    updateLegPositions() {
        const scaleX = this.tabletop.scale.x;
        const scaleZ = this.tabletop.scale.z;

        const tableWidth = this.tabletop.geometry.parameters.width * scaleX;
        const tableDepth = this.tabletop.geometry.parameters.depth * scaleZ;

        const positions = this.calculateLegPositions(tableWidth, tableDepth);

        this.legs.forEach((leg, index) => {
            leg.position.set(...positions[index]);
        });
    }
}

export { Table };
