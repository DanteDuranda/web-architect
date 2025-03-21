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

    drawDebugMarker(x, y, z, scene) {
        // Create a sphere geometry for the marker
        const markerGeometry = new THREE.SphereGeometry(0.1, 16, 16); // Small sphere
        const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red color

        const marker = new THREE.Mesh(markerGeometry, markerMaterial);

        marker.position.set(x, y, z);

        scene.add(marker);

        // remove after timeout
        setTimeout(() => {
            scene.remove(marker);
            marker.geometry.dispose();
            marker.material.dispose();
        }, 2000); // 2 secs
    }

    updateCursorIndicator(scene, debugEnabled, canvas, wallHeight, isWallPlacingActive, gridIntersects) {
        if (isWallPlacingActive && gridIntersects.length > 0) {
            canvas.style.cursor = 'none';
            const point = gridIntersects[0].point;
            const point2 = gridIntersects[1].point; // specific objects wich has "holes in it", i should use two points instead one

            // grid snap
            const gridSize = 1;
            point.x = Math.round(point.x / gridSize) * gridSize;
            point.z = Math.round(point2.z / gridSize) * gridSize;

            this.cursorGroup.position.set(point.x, wallHeight, point.z);

            // debug circle position update
            if (debugEnabled) {
                this.drawDebugMarker(point.x, 0, point.z, scene);
            }
        }else{
            canvas.style.cursor = 'default';
        }
    }

    static cornerToPoint(point, wallWidth, wallHeight, color) {
        const radiusTop = wallWidth / 2;
        const radiusBottom = wallWidth / 2;
        const radialSegments = 32;

        const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, wallHeight, radialSegments);
        const material = new THREE.MeshBasicMaterial({ color: color });
        const cylinder = new THREE.Mesh(geometry, material);

        cylinder.position.set(point.x, point.y + wallHeight / 2, point.z);

        return cylinder;
    }
}


export class FloorGenerator {
    constructor(isDebugEnabled=false) { // TODO: debug visualization for earclipping algoruithm
        this.isDebugEnabled = isDebugEnabled;
    }

    generateFloor(points) {
        if (typeof points !== 'object' || points.length < 3) return;

        if (this.#isCounterClockwise(points)) {
            points.reverse();
        }

        const floorGeometry = new THREE.BufferGeometry();
        let color = this.isDebugEnabled ? Math.floor(Math.random() * 0xFFFFFF) : '0xf1f792';
        const floorMaterial = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide, wireframe: false });
        const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);

        const triangleIndices = this.#earClippingTriangulation(points); // triangle index
        const vertices = new Float32Array(points.length * 3); // need to convert bc THREE.js bufferGeometry

        for (let i = 0; i < points.length; i++) {

            if (typeof points[i].x !== "number" || typeof points[i].y !== "number" || typeof points[i].z !== "number") {
                console.log("found a not valid parameter - {generateFloor(points)}");
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
                console.warn("ear not found - {earClippingTriangulation(points)}");
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


    #isCounterClockwise(points) { // Shoelace Formula || Gauss's Area Calculation
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length; // j = i+=1
            area += (points[j].x - points[i].x) * (points[j].z + points[i].z); // adds the vector's length
        }
        return area > 0;  // clockwise if positive and counterclockwise if negative, the name of the function is inverted bc of the screen coordinates are also inverted
    }

    // A* algorithm for create a room from the existing walls + the new walls
    static findShortestPathOnWalls(newPoligonStart, newPoligonEnd, placedWalls) {
        let openSet = new Map();  // unexplored points, sorted by estimated cost
        let cameFrom = new Map(); // stores the shortest path backtracking
        let gScore = new Map();   // shortest known distance
        let fScore = new Map();   // EXTIMATED total distance

        // start point
        gScore.set(newPoligonStart.toArray().toString(), 0);
        fScore.set(newPoligonStart.toArray().toString(), this.heuristic(newPoligonStart, newPoligonEnd));
        openSet.set(newPoligonStart.toArray().toString(), newPoligonStart);

        while (openSet.size > 0) {
            // find lowest f
            let currentKey = [...openSet.keys()].reduce((a, b) =>
                fScore.get(a) < fScore.get(b) ? a : b
            );

            let current = openSet.get(currentKey);

            if (current.equals(newPoligonEnd)) {
                return this.backTrackPath(cameFrom, current);
            }

            openSet.delete(currentKey);

            let neighbors = this.getPossibleSources(current, placedWalls);
            for (let wall of neighbors) {
                let neighbor = wall.p1.equals(current) ? wall.p2 : wall.p1;
                let neighborKey = neighbor.toArray().toString();

                // g-score
                let tentativeGScore = gScore.get(currentKey) + current.distanceTo(neighbor);

                if (!gScore.has(neighborKey) || tentativeGScore < gScore.get(neighborKey)) {
                    cameFrom.set(neighborKey, current);
                    gScore.set(neighborKey, tentativeGScore);
                    fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor, newPoligonEnd));

                    if (!openSet.has(neighborKey)) {
                        openSet.set(neighborKey, neighbor);
                    }
                }
            }
        }

        return [];
    }


    static heuristic(a, b) {
        return a.distanceTo(b); // euclidean distance
    }

    static backTrackPath(cameFrom, current) {
        let path = [current];

        while (cameFrom.has(current.toArray().toString())) {
            current = cameFrom.get(current.toArray().toString());
            path.unshift(current);
        }

        return path.reverse();
    }

    static getPossibleSources(newPoligonStart, placedWalls) {
        let sources = [];

        for (let i = 0; i < placedWalls.length; i++) {
            let wall = placedWalls[i];

            if (wall.p1.equals(newPoligonStart)) {
                sources.push(wall);
                /*if (this.debugEnabled)
                    this.drawLine(newPoligonStart, wall.p2);*/
            } else if (wall.p2.equals(newPoligonStart)) {
                sources.push(wall);
                /*if (this.debugEnabled)
                    this.drawLine(newPoligonStart, wall.p1);*/
            }
        }

        return sources;
    }

    drawLine(start, end) {
        let material = new THREE.LineBasicMaterial({ color: 0xff0000 }); // Red line
        let geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
        let line = new THREE.Line(geometry, material);
        line.thickness = 2;
        line.position.y += 5;
        scene.add(line);
    }
}
