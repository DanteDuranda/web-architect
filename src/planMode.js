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

        // cross lines
        const crossLength = this.radius * this.crossLengthFactor;

        // horizontal line
        const horizontalGeometry = new THREE.BoxGeometry(crossLength, this.crossThickness, this.crossThickness);
        const horizontalMaterial = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
        const horizontalLine = new THREE.Mesh(horizontalGeometry, horizontalMaterial);

        // vertical line
        const verticalGeometry = new THREE.BoxGeometry(this.crossThickness, crossLength, this.crossThickness);
        const verticalMaterial = new THREE.MeshBasicMaterial({ color: 0x0000FF });
        const verticalLine = new THREE.Mesh(verticalGeometry, verticalMaterial);
        verticalLine.rotation.x = -Math.PI / 2;

        // group all parts
        const cursorGroup = new THREE.Group();
        cursorGroup.add(planCursor);
        cursorGroup.add(horizontalLine);
        cursorGroup.add(verticalLine);

        return cursorGroup;
    }

    // resize the cursor based on zoom level
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

        this.cursorGroup.scale.setScalar(cursorScale);
        // console.log(`cursor Scale: ${this.cursorGroup.scale.x}, zom Level: ${zoom}`);
    }
}


export class FloorGenerator {
    #scene;

    constructor(scene, isDebugEnabled=false) { //TODO: debug visualization for earclipping algoruithm
        this.#scene = scene;
    }

    generateFloor(points) {
        if (typeof points !== 'object' ) return; // needs 3 points to form polygon

        const floorGeometry = new THREE.BufferGeometry();
        const floorMaterial = new THREE.MeshBasicMaterial({ color: 0xf1f792, side: THREE.DoubleSide, wireframe: false });
        const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);

        const triangleIndices = this.#earClippingTriangulation(points); // triangle index
        const vertices = new Float32Array(points.length * 3); // need to convert bc THREE.js bufferGeometry

        for (let i = 0; i < points.length; i++) {

            if (typeof points[i].x !== "number" || typeof points[i].y !== "number" || typeof points[i].z !== "number") {
                console.log("Found a not valid parameter for the floor generator.");
                return;
            }

            vertices[i * 3] = points[i].x;     // 0 * 3 = 0     ; 3 ...
            vertices[i * 3 + 1] = points[i].y; // 0 * 3 + 1 = 1 ; 4 ...
            vertices[i * 3 + 2] = points[i].z; // 0 * 3 + 2 = 2 ; 5 ...
        }

        floorGeometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
        floorGeometry.setIndex(triangleIndices);

        floorMesh.position.y += 0.1;

        return floorMesh;
    }

    #earClippingTriangulation(points) {
        let indices = [];
        let remainingPoints = points.map((p, i) => i); // store indices instead of removing objects

        while (remainingPoints.length > 3) {
            let earFound = false;
            for (let i = 0; i < remainingPoints.length; i++) {
                if (this.#isEar(i, remainingPoints, points)) {
                    const prev = remainingPoints[(i - 1 + remainingPoints.length) % remainingPoints.length];
                    const curr = remainingPoints[i];
                    const next = remainingPoints[(i + 1) % remainingPoints.length];

                    indices.push(prev, curr, next);
                    remainingPoints.splice(i, 1); // Remove ear
                    earFound = true;
                    break;
                }
            }

            if (!earFound) {
                console.warn("failed to triangulate the polygon (ear not found)");
                return [];
            }
        }

        indices.push(remainingPoints[0], remainingPoints[1], remainingPoints[2]); // last remaining triangle

        return indices;
    }

    #isEar(i, remainingPoints, points) {
        const prev = points[remainingPoints[(i - 1 + remainingPoints.length) % remainingPoints.length]];
        const curr = points[remainingPoints[i]];
        const next = points[remainingPoints[(i + 1) % remainingPoints.length]];

        if (!this.#isConvex(prev, curr, next)) return false;

        for (let j = 0; j < remainingPoints.length; j++) {
            if (j !== i && j !== (i - 1 + remainingPoints.length) % remainingPoints.length && j !== (i + 1) % remainingPoints.length) {
                const testPoint = points[remainingPoints[j]];
                if (this.#pointInTriangle(testPoint, prev, curr, next)) {
                    return false;
                }
            }
        }
        return true;
    }

    #pointInTriangle(testPoint, prev, curr, next) { // TODO: nagyon fontos lenne, hogy ez normálisan működjön...
        const d1 = this.#sign(testPoint, prev, curr);
        const d2 = this.#sign(testPoint, curr, next);
        const d3 = this.#sign(testPoint, next, prev);
        return (d1 >= 0 && d2 >= 0 && d3 >= 0) || (d1 <= 0 && d2 <= 0 && d3 <= 0);
    }

    #sign(point1, point2, point3) {
        return (point1.x - point3.x) * (point2.z - point3.z) - (point2.x - point3.x) * (point1.z - point3.z);
    }

    #isConvex(prev, curr, next) {
        return (curr.x - prev.x) * (next.z - prev.z) - (curr.z - prev.z) * (next.x - prev.x) >= 0;
    }
}

