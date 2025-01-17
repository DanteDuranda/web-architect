import * as THREE from "three";

export class PlanCursor {
    constructor(radius = 0.2, crossThickness = 0.05, crossLengthFactor = 10) {
        this.radius = radius;
        this.crossThickness = crossThickness;
        this.crossLengthFactor = crossLengthFactor;

        this.cursorGroup = this.createCursor();
        this.resizeCursor(1);
    }

    createCursor() {
        const segments = 20; // Number of segments for the circle

        // center circle
        const circleGeometry = new THREE.CircleGeometry(this.radius, segments);
        const circleMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
        const planCursor = new THREE.Mesh(circleGeometry, circleMaterial);
        planCursor.rotation.x = -Math.PI / 2; // Align with XZ plane
        planCursor.position.y += 1;

        // Cross lines
        const crossLength = this.radius * this.crossLengthFactor;

        // Horizontal line
        const horizontalGeometry = new THREE.BoxGeometry(crossLength, this.crossThickness, this.crossThickness);
        const horizontalMaterial = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
        const horizontalLine = new THREE.Mesh(horizontalGeometry, horizontalMaterial);

        // Vertical line
        const verticalGeometry = new THREE.BoxGeometry(this.crossThickness, crossLength, this.crossThickness);
        const verticalMaterial = new THREE.MeshBasicMaterial({ color: 0x0000FF });
        const verticalLine = new THREE.Mesh(verticalGeometry, verticalMaterial);
        verticalLine.rotation.x = -Math.PI / 2;

        // Group all parts
        const cursorGroup = new THREE.Group();
        cursorGroup.add(planCursor);
        cursorGroup.add(horizontalLine);
        cursorGroup.add(verticalLine);

        return cursorGroup;
    }

    // Resize the cursor based on zoom level
    resizeCursor(zoom) {
        let cursorScale;
        if (zoom >= 1 && zoom < 5) {
            cursorScale = 1;
        } else if (zoom >= 5 && zoom < 20) {
            cursorScale = 0.5;
        } else if (zoom >= 20 && zoom < 30) {
            cursorScale = 0.2;
        } else if (zoom >= 30 && zoom < 40) {
            cursorScale = 0.1;
        } else if (zoom >= 40) {
            cursorScale = 0.02;
        }

        // Update scale of cursor group
        this.cursorGroup.scale.setScalar(cursorScale);

        // Optional: debug log to track cursor scaling
        // console.log(`Cursor Scale: ${this.cursorGroup.scale.x}, Zoom Level: ${zoom}`);
    }

    // Call this function to update the cursor's scale based on camera's zoom level
    updateCursorScale() {
        this.resizeCursor(this.zoom);
    }
}

export class PlanSideBar {
    constructor(sidebar) {

    }
}