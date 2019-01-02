//Create the renderer
let App = PIXI.Application,
	Container = PIXI.Container,
	loader = PIXI.loader,
	resources = PIXI.loader.resources,
	Sprite = PIXI.Sprite,
	Graphics = PIXI.Graphics,
	TextureCache = PIXI.utils.TextureCache;
MovieClip = PIXI.extras.AnimatedSprite;

let app = new App({
	width: 417,
	height: 736,
	antialias: true,
	transparent: false,
	resolution: 2,
	autoResize: true,
	backgroundColor: 0x202124
});
app.stage.interactive = true;

let su = new SpriteUtilities(PIXI);
let t = new Tink(PIXI, app.view);

//Add the canvas to the HTML document
document.body.appendChild(app.view);

// init globals
let state,
	rocket,
	rocketOuterContainer,
	rocketWindow,
	flame,
	saturn,
	mars,
	id;

let starAmount = 350, // bg star amount
	fgStarAmount = 8, // foreground yellow stars
	fgStarContainer,
	cameraZ = 0,
	fov = 20,
	starBaseSpeed = 0.025,
	starSpeed = 0,
	warpSpeed = 0,
	starStretch = 5,
	starBaseSize = 0.05;

// play
let stars = [],
	fgStars = [];

// load resources
let loadProgressHandler = (loader, resource) => {
	console.log(`loading ${resource.url}`);
	console.log(`progress ${loader.progress}%`);
};

function keyboard(value) {
	let key = {};
	key.value = value;
	key.isDown = false;
	key.isUp = true;
	key.press = undefined;
	key.release = undefined;

	// down handler
	key.downHandler = event => {
		if (event.key === key.value) {
			if (key.isUp && key.press) key.press();
			key.isDown = true;
			key.isUp = false;
			event.preventDefault();
		}
	};

	// up handler
	key.upHandler = event => {
		if (event.key === key.value) {
			if (key.isDown && key.release) key.release();
			key.isDown = false;
			key.isUp = true;
			event.preventDefault();
		}
	};

	// attach event listeners
	const downListener = key.downHandler.bind(key);
	const upListener = key.upHandler.bind(key);

	window.addEventListener("keydown", downListener, false);
	window.addEventListener("keyup", upListener, false);

	// detach event listeners
	key.unsubscribe = () => {
		window.removeEventListener("keydown", downListener);
		window.removeEventListener("keyup", upListener);
	};

	return key;
}


let setup = () => {
	id = resources["images/rocket.json"].textures;

	// stars!
	let starShape = new Graphics();
	starShape.beginFill(0xffffff);
	starShape.drawCircle(0, 0, 1.5);
	starShape.endFill();

	let starTexture = starShape.generateTexture();
	// generate background stars
	makeStars(starTexture, starAmount, stars);

	// foreground stars
	makeStars(null, fgStarAmount, fgStars);

	// planets
	saturn = new Sprite(id["planet_saturn.png"]);
	saturn.vy = 0.4;
	mars = new Sprite(id["planet_mars.png"]);
	saturn.scale.set(0.4);
	mars.scale.set(0.5);

	randomizeStar(mars, false);
	randomizeStar(saturn, false);

	app.stage.addChild(saturn);
	app.stage.addChild(mars);

	// rocket
	rocket = new Container();
	rocketOuterContainer = new Container();

	let rocketBody = new Sprite(id["rocket_body.png"]);
	rocket.center = rocketBody.width/2;

	rocketWindow = new Sprite(id["window.png"]);
	rocketWindow.anchor.set(0.5);
	rocketWindow.x = rocketBody.width / 2;
	rocketWindow.y = rocketBody.height / 2;

	// window move distance for turning

	rocketWindow.maxDist = rocketBody.width /2;
	// rocketWindow.x += rocketWindow.maxDist;

	let windowMask = new Sprite (id["rocket_body_mask.png"]);
	rocketWindow.mask = windowMask;

	flame = new Sprite(id["flame.png"]);
	flame.x = rocketBody.width / 2;
	flame.y = rocketBody.height - 8;
	flame.anchor.y = 0;
	flame.anchor.x = 0.5;

	flame.maxStretch = 1.1;
	let flameTl = new TimelineMax();
	flameTl.to(flame, 0.08, {
		pixi: {
			y: "+=4",
			scaleY: flame.maxStretch
		},
		yoyo: true,
		repeat: -1
	});

	let wingFrames = su.frameSeries(0, 18, "wing_sprite-", ".png");
	let wingSprite = su.sprite(wingFrames);

	wingSprite.x = rocketBody.width / 2 - wingSprite.width / 2;
	wingSprite.y = rocketBody.height - 48;
	wingSprite.loop = false;

	// acceleration + friction
	rocket.accelerationX = 0;
	rocket.frictionX = 1;
	rocket.accelerationY = 0;
	rocket.frictionY = 1;
	rocket.speed = 0.2;
	rocket.drag = 0.4;

	rocket.addChild(flame);
	rocket.addChild(rocketBody);
	rocket.addChild(rocketWindow);
	rocket.addChild(windowMask);
	rocket.addChild(wingSprite);

	// init velocity props and position
	rocket.scale.set(0.5);
	rocket.x = app.screen.width / 2 - rocket.width / 2;
	rocket.y = app.screen.height - rocket.height - 100;
	rocket.vx = 0;
	rocket.vy = 0;

	// rocketOuterContainer.addChild(rocket);
	app.stage.addChild(rocket);
	TweenMax.from(rocket, 1, {
		pixi: {
			y: app.screen.height
		},
		ease: Power2.easeInOut
	});

	////////////////////////////////////////////////////
	// keyboard
	let left = keyboard("ArrowLeft"),
		right = keyboard("ArrowRight"),
		up = keyboard("ArrowUp"),
		down = keyboard("ArrowDown");

	let wingReversed = false;

	// left key press
	left.press = () => {
		rocket.accelerationX = -rocket.speed;
		rocket.frictionX = 1;

		if (!wingReversed) {
			wingFrames.reverse();
			wingReversed = true;
		}
		wingSprite.playAnimation(0, 3);
	};

	left.release = () => {
		if (!right.isDown) {
			// rocket.vx = 0;
			rocket.accelerationX = 0;
			rocket.frictionX = rocket.drag;
		}
		wingFrames.reverse();
		wingReversed = false;
		wingSprite.stopAnimation();
		wingSprite.show(0);
	};

	// right key press
	right.press = () => {
		rocket.accelerationX = rocket.speed;
		rocket.frictionX = 1;

		wingSprite.playAnimation(0, 6);

	};

	right.release = () => {
		if (!left.isDown) {
			rocket.accelerationX = 0;
			rocket.frictionX = rocket.drag;
		}
		wingSprite.stopAnimation();
		wingSprite.show(0);
	};

	// up key press
	up.press = () => {
		rocket.accelerationY = -rocket.speed;
		rocket.frictionY = 1;
	};

	up.release = () => {
		if (!down.isDown) {
			rocket.accelerationY = 0;
			rocket.frictionY = rocket.drag;
		}
	};

	// down key press
	down.press = () => {
		rocket.accelerationY = rocket.speed;
		rocket.frictionY = 1;
	};

	down.release = () => {
		if (!up.isDown) {
			rocket.accelerationY = 0;
			rocket.frictionY = rocket.drag;
		}
	};

	state = play;

	app.ticker.add(delta => gameLoop(delta));
};
// game loop
let gameLoop = delta => {
	state(delta);
};
let play = delta => {
	// add acceleration to velocity
	rocket.vx += rocket.accelerationX;
	rocket.vy += rocket.accelerationY;
	// add friction
	rocket.vx *= rocket.frictionX;
	rocket.vy *= rocket.frictionY;

	let collision = contain(rocket, {
		x: 0,
		y: 0,
		width: app.screen.width,
		height: app.screen.height
	});

	//Check for a collision. If the value of `collision` isn't
	//`undefined` then you know the sprite hit a boundary
	if (collision) {
		//Reverse the sprite's `vx` value if it hits the left or right
		if (collision.has("left") || collision.has("right")) {
			rocket.vx = -rocket.vx;
		}

		//Reverse the sprite's `vy` value if it hits the top or bottom
		if (collision.has("top") || collision.has("bottom")) {
			rocket.vy = -rocket.vy;
		}

		//Optionally display the values that the `collision` set contains
		collision.forEach(item => console.log(item));
	}
	// update velocity
	rocket.vx = rocket.vx;
	rocket.x += rocket.vx;

	rocket.vy = rocket.vy;
	rocket.y += rocket.vy;

	// starz
	starSpeed += (warpSpeed - starSpeed) / 20;
	// cameraZ += delta * 10 * (starSpeed + starBaseSpeed);
	// animate background stars
	for (let i = 0; i < starAmount; i++) {
		let star = stars[i];
		starsAnim(star.sprite);
	}
	for (let j = 0; j < fgStarAmount; j++) {
		let fgStar = fgStars[j];
		starsAnim(fgStar);
	}
	// animate planets
	starsAnim(mars);
	starsAnim(saturn);
};

function makeStars(texture, amount, holderArray) {
	let star;
	// if we're passing in a star sprite
	for (let i = 0; i < amount; i++) {
		if (texture) {
			star = {
				sprite: new Sprite(texture),
				z: 0,
				x: 0,
				y: 0,
				vy: (Math.random()) * 0.01
			};
			console.log(star.vy)
			star.sprite.anchor.set(0.5);
			app.stage.addChild(star.sprite);
			randomizeStar(star.sprite);
		} else {
			star = new Container();
			let starGlow = new Sprite(id["star_glow.png"]);
			let starGraphic = new Sprite(id["star.png"]);
			starGlow.anchor.set(0.5);
			starGraphic.anchor.set(0.5);
			star.addChild(starGlow);
			star.addChild(starGraphic);
			star.scale.set(randomInt(2, 6) * 0.1);
			star.vy = (Math.random() + 1) * 0.6;
			app.stage.addChild(star);
			randomizeStar(star, false);
		}
		holderArray.push(star);
	}
}

function starsAnim(star) {
	star.y += star.vy;
	if (star.y > app.screen.height) {
		star.y = -20;
	}
}

//The contain helper function
function contain(sprite, container) {
	//Create a set called `collision` to keep track of the
	//boundaries with which the sprite is colliding
	var collision = new Set();

	//Left
	if (sprite.x < container.x) {
		sprite.x = container.x;
		collision.add("left");
	}

	//Top
	if (sprite.y < container.y) {
		sprite.y = container.y;
		collision.add("top");
	}

	//Right
	if (sprite.x + sprite.width > container.width) {
		sprite.x = container.width - sprite.width;
		collision.add("right");
	}

	//Bottom
	// if (sprite.y + sprite.height > container.height) {
	// 	sprite.y = container.height - sprite.height;
	// 	collision.add("bottom");
	// }

	//If there were no collisions, set `collision` to `undefined`
	if (collision.size === 0) collision = undefined;

	//Return the `collision` value
	return collision;
}

function randomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomizeStar(star, fade = true) {
	star.x = randomInt(0, app.screen.width);
	star.y = randomInt(0, app.screen.height);
	star.vy = Math.random() + 1;
	if (fade) star.alpha = Math.random();
}

// kick it off!

loader
	.add(["images/rocket.json"])
	.on("progress", loadProgressHandler)
	.load(setup);

let scale;
let onResize = event => {
	return (scale = scaleToWindow(app.renderer.view, "black"));
};
window.addEventListener("resize", onResize);
onResize();
