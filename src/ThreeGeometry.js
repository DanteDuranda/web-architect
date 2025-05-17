import * as THREE from 'three';


const FLOOR_HEIGHT = 0.1;

class ThreeGeometry {

    static CreateCube(length=1, height=1, width=1, color=0xffffff)
    {
        let boxGeometry = new THREE.BoxGeometry(length, height, width);
        let boxMaterial = new THREE.MeshBasicMaterial({color: color});

        return new THREE.Mesh(boxGeometry, boxMaterial);
    }

    static CreateCylinder(width=1, height=1, color=0xffffff, position=null)
    {
        let cylinderGeometry = new THREE.CylinderGeometry(width, width, height);
        let cylinderMaterial = new THREE.MeshBasicMaterial({color: color});

        let cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial)

        if (position)
            cylinder.position.set(position.x, position.y + (height / 2), position.z);

        return cylinder;
    }

    static createExtrudedFloor(points) {
        const poligon = new THREE.Shape();

        poligon.moveTo(points[0].x, points[0].z);
        for (let i = 1; i < points.length; i++) {
            poligon.lineTo(points[i].x, points[i].z);
        }

        const extrudeSettings = { depth: FLOOR_HEIGHT, bevelEnabled: false };

        const geometry = new THREE.ExtrudeGeometry(poligon, extrudeSettings);
        const material = new THREE.MeshBasicMaterial({ color: Math.floor(Math.random() * 0xFFFFFF), side: THREE.DoubleSide });
        const floorMesh = new THREE.Mesh(geometry, material);

        floorMesh.rotation.x = Math.PI / 2;
        floorMesh.position.y = points[0].y + FLOOR_HEIGHT + 0.01; // + 0.01 to prevent texture clipping between the walls and the floor

        return floorMesh;
    }
}

export { ThreeGeometry };