import * as THREE from 'three';
import { TransformControls } from "TransformControls";


export class WTransformControl extends TransformControls {
    constructor(camera, canvas) {
        super(camera, canvas);

        this.#recolorArrows();
    }

    #recolorArrows() {
        if (this.children[0]) {
            this.children[0].traverse((child) => {
                if (child.material) {
                    if (child.name.includes("X")) {
                        child.material.color.set(0xfbeee0); // x
                    } else if (child.name.includes("Y")) {
                        child.material.color.set(0xfbeee0); // y
                    } else if (child.name.includes("Z")) {
                        child.material.color.set(0xfbeee0); // z
                    }
                }
            });
        }
    }
}