export class SideBar {
    constructor() {
        this.sideBar = document.querySelector(".side-bar");
    }

    updateSidebar(isPlanModeActive) {
        if (isPlanModeActive) {
            this.sideBar.innerHTML = `
            <h3 style="font-family:sans-serif;">Plan mode</h3>
            <h4 style="margin: 0; font-family:sans-serif;">Wall builder</h4>
            <div style="border: 2px solid black; padding: 10px; margin-bottom: 5px; margin-left: 5px; margin-right: 10px">
                <div style="margin-top: 10px;">
                    <label for="width" style="font-family:sans-serif;">Width:</label>
                    <input 
                        type="number" 
                        id="width" 
                        style="
                            width: 60px; 
                            margin-left: 5px; 
                            padding: 5px; 
                            border: 1px solid gray;
                        " 
                        placeholder="0">
                </div>
                <div style="margin-top: 10px;">
                    <label for="height" style="font-family:sans-serif;">Height:</label>
                    <input 
                        type="number" 
                        id="height" 
                        style="
                            width: 60px; 
                            margin-left: 5px; 
                            padding: 5px; 
                            border: 1px solid gray;
                        " 
                        placeholder="0">
                </div>
            </div>
            <h4 style="margin: 0; font-family:sans-serif;">Grid Settings</h4>
            <div style="border: 2px solid black; padding: 10px; margin-left: 5px; margin-right: 5px">
                <div style="display: flex; align-items: center; margin-top: 10px;">
                    <div>
                        <label>
                            <input type="checkbox" id="m" style="margin-right: 5px;"> m
                        </label>
                        <br>
                        <label>
                            <input type="checkbox" id="dm" style="margin-right: 5px;"> cm
                        </label>
                        <br>
                        <label>
                            <input type="checkbox" id="cm" style="margin-right: 5px;"> cm
                        </label>
                    </div>
                    <div style="margin-left: 20px;">
                        <label>
                            <input type="checkbox" id="snapToGrid" style="margin-right: 5px;"> Snap to Grid
                        </label>
                        <br>
                        <label>
                            <input type="checkbox" id="snapToWall" style="margin-right: 5px;"> Snap to Wall
                        </label>
                    </div>
                </div>
            </div>
        `;
        } else if (!isPlanModeActive) {
            this.sideBar.innerHTML = `
                <h3>Design Mode</h3>
                <button onclick="startDesign()">Start Design</button>
                <p>Current Mode: Design Mode</p>
            `;
        }
    }
}


function toggleActivate() {
    const button = document.getElementById('activateToggle');
    if (button.textContent === 'Activate') {
        button.textContent = 'Deactivate';
        button.style.backgroundColor = 'lightgreen';
    } else {
        button.textContent = 'Activate';
        button.style.backgroundColor = 'lightgray';
    }
}