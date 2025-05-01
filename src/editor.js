import { AppState, ObjectFilter } from "./AppState.js";
import {Telemetry} from "./Ui2d.js";
import {WinDoor} from "./WinDoor.js";

AppState.init();

animate();

function animate() {
    Telemetry.updateStats();
    requestAnimationFrame(animate);

    if (AppState.wmouse.wTransformControls.object && AppState.wmouse.wTransformControls.object.name !== "wallGeometry")
    {
        AppState.wmouse.wTransformControls.updateGizmoSize();
        AppState.wmouse.wTransformControls.updateRayLines(ObjectFilter.addedFurnitures, ObjectFilter.placedWalls);
    }

    AppState.Render();

    if (AppState.wmouse.wTransformControls.object && AppState.wmouse.wTransformControls.object instanceof WinDoor) {
        const wall = AppState.wmouse.wTransformControls.object.wall;
        wall.updateWindoorOnWall();
    }
}
