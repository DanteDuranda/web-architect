import * as THREE from 'three';

class ThreeGeometry {

    static CreateCube(length=1, height=1, width=1, color=0xffffff)
    {
        let boxGeometry = new THREE.BoxGeometry(width, height, width);
        let boxMaterial = new THREE.MeshBasicMaterial({color: color});

        return new THREE.Mesh(boxGeometry, boxMaterial);
    }

    static CreateCylinder(width=1, height=1, color=0xffffff)
    {
        let cylinderGeometry = new THREE.CylinderGeometry(width, width, height);
        let cylinderMaterial = new THREE.MeshBasicMaterial({color: color});

        return new THREE.Mesh(cylinderGeometry, cylinderMaterial);
    }
}

export { ThreeGeometry };