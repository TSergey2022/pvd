import Phaser from 'phaser';
import { BulletsManager } from '../src/systems/BulletsManager.js';
import { ParticlesSystem } from '../src/systems/ParticleSystem.js';
import { ParticleGunFire } from '../src/vfx/particleGunFire.js';
import { ParticleHitWall } from '../src/vfx/particleHitWall.js';
import { Penguin } from 'src/modules/Penguin/Penguin.js';
import { Gun } from '../src/modules/Gun/Gun.js';
import { ParticleGunCocking } from 'src/vfx/particleGunCocking.js';
import { loadPenguinsNGunsAssets } from 'src/utils/resource-loaders/load-penguins-n-guns-assets.js';
import { Dog } from 'src/modules/Dog/Dog.js';
import Unit from 'src/objects/Unit.js';
import Vector2 from 'phaser/src/math/Vector2.js';
import { AvoidCollisionSteering } from 'src/ai/steerings/avoid-collision-steering.js';
import { PatrolSteering } from 'src/ai/steerings/patrol-steering.js';

// debug bullets params
const bulletsDepth = 0; // set 11 - bullets will display above column

export default class AIDemoScene extends Phaser.Scene {
    /** @type {Array<Unit>} */ gameObjects;
    /** @type {Array<Penguin>} */ penguins;
    /** @type {Array<Dog>} */ dogs;

    constructor() {
        super({ key: 'AIDemoScene' });
    }

    preload() {
        loadPenguinsNGunsAssets(this);
        this.load.image('tiles', 'tileset/Dungeon_Tileset.png');
        this.load.tilemapTiledJSON('map', 'dungeon_room.json');

        this.load.image('dog01', 'sprites/pack/Characters/Dogs/Dog01/Idle/Idle_00.png');
        this.load.audio('gun_cocking', 'sfx/gun-cocking.mp3');

        BulletsManager.preload(this);

        // Preload assets for particle
        ParticlesSystem.preload(
            this,
            {
                'GunFire': new ParticleGunFire(),
                'HitWall': new ParticleHitWall(),
                'GunCocking': new ParticleGunCocking()
            }
        );
    }

    create() {
        ParticlesSystem.init();

        this.gameObjects = [];
        this.penguins = [];
        this.dogs = [];

        this.createMap();

        this.physics.world.bounds.width = this.map.widthInPixels;
        this.physics.world.bounds.height = this.map.heightInPixels;

        this.createDog();
        this.createPenguin();

        // add layers or array of game objects in second param, that mean blocking with bullets
        BulletsManager.create([this.worldLayer, this.aboveLayer, this.aboveUpper, this.gameObjects], bulletsDepth);
        // const objectBodies = this.gameObjects.map(obj => obj.getPhysicBody());
        // console.log(objectBodies);
        // BulletsManager.create(this.gameObjects, bulletsDepth);

        this.flag = this.add.circle(0, 0, 5, 0xff0000);

        this.lastTick = getTime();

        this.setupInputs();
    }

    setupInputs() {
        this.input.on('pointerdown', event => {
            if (event.leftButtonDown()) {
                const mouseX = this.input.mousePointer.x;
                const mouseY = this.input.mousePointer.y;
                this.penguin.setDestination(new Vector2(mouseX, mouseY))
                this.flag.x = mouseX;
                this.flag.y = mouseY;
            }
        });

        this.input.keyboard.on('keydown-R', event => {
            this.penguin.reloadGun();
        });
    }

    createMap() {
        this.map = this.make.tilemap({ key: 'map' });

        this.tileset = this.map.addTilesetImage('Dungeon_Tileset', 'tiles');

        this.belowFloor = this.map.createLayer('Ground', this.tileset, 0, 0);
        this.belowLayer = this.map.createLayer('Floor', this.tileset, 0, 0);
        this.worldLayer = this.map.createLayer('Walls', this.tileset, 0, 0);
        this.decals = this.map.createLayer('Decals', this.tileset, 0, 0);
        this.aboveLayer = this.map.createLayer('Upper', this.tileset, 0, 0);
        this.aboveUpper = this.map.createLayer('Leaves', this.tileset, 0, 0);
        this.tileSize = 32;

        this.worldLayer.setCollisionBetween(1, 500);
        this.aboveLayer.setDepth(10);

        AvoidCollisionSteering.tilemapLayer = this.worldLayer;
    }

    createDog() {
        // spawn not animated dog for debug collision
        const dog = new Dog(this, 600, 300, { health: 100, damage: 50, reward: 1, assetKey: 'dog01' });

        // @ts-ignore
        if (!dog.dogStateTable.patrolState.steering instanceof PatrolSteering) throw new Error("unexpected steering!")

        // @ts-ignore
        dog.dogStateTable.patrolState.steering.addPatrolPoint(new Phaser.Math.Vector2(600, 100));
        // @ts-ignore
        dog.dogStateTable.patrolState.steering.addPatrolPoint(new Phaser.Math.Vector2(600, 400));
        this.gameObjects.push(dog);
        this.dogs.push(dog);
    }

    createPenguin() {
        const gunConfig = new Gun({
            'id': '7b90d51a-13e6-4d5b-b1e6-af19a6c2e8d1',
            'name': 'Red Banner Grandma\'s Machine Gun',
            'assetKey': '9g',
            'weaponType': 'Machine Gun',
            'damage': 40,
            'cost': 3000,
            'range': 400,
            'bullets': 4,
            'bulletType': 'bullet2',
            'cooldownTime': 0.2,
            'muzzlePosition': {
                x: 55,
                y: 20
            }
        });

        this.penguin = new Penguin(this, 100, 300, [], {
            bodyKey: '2c',
            gunConfig,
            stats: { health: 200 },
            target: null,
            faceToTarget: true,
        });

        this.gameObjects.push(this.penguin);
        this.penguins.push(this.penguin);
    }

    update() {
        const currentTime = getTime();
        const deltaTime = (currentTime - this.lastTick) / 1000;

        if (this.gameObjects) {
            this.gameObjects.forEach(function (element) {
                element.update(currentTime, deltaTime);
            });
        }

        BulletsManager.update(deltaTime);

        this.lastTick = getTime();
    }

    /**
     * @param {number} tileX
     * @param {number} tileY
     */
    tilesToPixels(tileX, tileY) {
        return [tileX * this.tileSize, tileY * this.tileSize];
    }
}

function getTime() {
    return new Date().getTime();
}
