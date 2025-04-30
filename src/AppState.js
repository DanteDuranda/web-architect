import {Wall} from "./Wall.js";
import {Furniture} from "./Furniture.js";
import {Room} from "./Room.js";

/**
 * @class ObjectFilter
 * @description Static class that manages a collection of furnitures.
 */
export class ObjectFilter {
    static addedFurnitures = [];
    static placedWalls = [];
    static placedRooms = [];

    static removeByInstance(item) {
        if (item instanceof Wall) {
            this.removeWall(item);
        } else if (item instanceof Furniture) {
            this.removeFurniture(item);
        } else {
            throw new Error(`there is no such instance: ${item}`);
        }
    }

    static addByInstance(item) {
        const isArray = Array.isArray(item);
        const checkItem = isArray ? item[0] : item;

        if (checkItem instanceof Wall) {
            this.addWall(item);
        } else if (checkItem instanceof Furniture) {
            this.addFurniture(item);
        } else if (checkItem instanceof Room) {
            this.addRoom(item);
        } else {
            throw new Error(`there is no such instance: ${checkItem}`);
        }
    }

    static removeFurniture(furniture) {
        this.addedFurnitures = this.addedFurnitures.filter(f => f !== furniture);
    }

    static removeWall(wall) {
        // Remove from placedWalls
        this.placedWalls = this.placedWalls.filter(f => f !== wall);

        for (let room of this.placedRooms) {
            room.roomWalls = room.roomWalls.filter(roomWall => roomWall !== wall);

            if(room.roomWalls.length < 1)
                room.deleteFloor();
        }
    }

    static removeRoom(room) {
        this.placedRooms = this.placedRooms.filter(r => r !== room);
    }

    static addFurniture(furniture) {
        if (!this.addedFurnitures.includes(furniture)) {
            this.addedFurnitures.push(furniture);
        }
    }

    static addWall(walls) {
        if (Array.isArray(walls)) {
            walls.forEach(wall => {
                if (!this.placedWalls.includes(wall)) {
                    this.placedWalls.push(wall);
                }
            });
        } else {
            if (!this.placedWalls.includes(walls)) {
                this.placedWalls.push(walls);
            }
        }
    }

    static addRoom(room) {
        if (!this.placedRooms.includes(room)) {
            this.placedRooms.push(room);
        }
    }
}

export default ObjectFilter;