import * as THREE from 'three';
import { TransformControls } from "TransformControls";


export class WTransformControl extends TransformControls {
    constructor(camera, canvas) {
        super(camera, canvas);

        this.setTranslationSnap(0.1)
        this.#recolorArrows();
        this.setSize(0.5);
    }

    #recolorArrows() {
        this._gizmo.gizmo.translate.children.splice(1, 1); // remove the negative side arrows
        this._gizmo.gizmo.translate.children.splice(6, 1);

        if (this.children[0]) {
            this.children[0].traverse((child) => {
                if (child.material) {
                    if (child.name.includes("X")) {
                        child.material.color.set(0xFFA500); // x
                    } else if (child.name.includes("Y")) {
                        child.material.color.set(0xFFA500); // y
                    } else if (child.name.includes("Z")) {
                        child.material.color.set(0xFFA500); // z
                    }
                }
            });
        }
    }

    attach(object) {
        super.attach(object);

        this.showY = false;
        this.showX = true;
        this.showZ = true;
    }

    //https://discourse.threejs.org/t/how-to-prevent-shrinking-transformcontrols/60714
    //https://codepen.io/boytchev/pen/MWxOWga
    updateGizmoSize() {
        const size = 20 / this.position.distanceTo(this.camera.position) *
            Math.min(1.9 * Math.tan(Math.PI * this.camera.fov / 360) / this.camera.zoom, 7);

        this.setSize(size / 5);
    }
}