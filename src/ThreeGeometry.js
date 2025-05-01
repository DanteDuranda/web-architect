import * as THREE from 'three';
const FLOOR_HEIGHT = 0.1;

class ThreeGeometry {

    static CreateCube(length=1, height=1, width=1, color=0xffffff)
    {
        let boxGeometry = new THREE.BoxGeometry(length, height, width);
        let boxMaterial = new THREE.MeshBasicMaterial({color: color});

        return new THREE.Mesh(boxGeometry, boxMaterial);
    }

    static CreateCylinder(width=1, height=1, color=0xffffff)
    {
        let cylinderGeometry = new THREE.CylinderGeometry(width, width, height);
        let cylinderMaterial = new THREE.MeshBasicMaterial({color: color});

        return new THREE.Mesh(cylinderGeometry, cylinderMaterial);
    }

    static createExtrudedFloor(points) {
        const shape = new THREE.Shape();
        shape.moveTo(points[0].x, points[0].z);

        for (let i = 1; i < points.length; i++) {
            shape.lineTo(points[i].x, points[i].z);
        }

        const extrudeSettings =
            {
                depth: FLOOR_HEIGHT,
                bevelEnabled: false
            };

        let color = Math.floor(Math.random() * 0xFFFFFF);

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const material = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
        const floorMesh = new THREE.Mesh(geometry, material);

        floorMesh.rotation.x = Math.PI / 2;
        floorMesh.position.y = points[0].y + FLOOR_HEIGHT + 0.01; // + 0.01 to prevent texture clipping between the walls and the floor

        return floorMesh;
    }
}

export { ThreeGeometry };