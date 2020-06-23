if (typeof require === 'undefined') {
	throw new Error('map-watch does not work in the browser')
}

const fs = require('fs');
const fsP = fs.promises;

const ASSETS_DIR = 'assets/';
const MAPS_DIR = 'data/maps/';
const MAP_FILE_EXTENSION = '.json';

export default class MapWatcher {
	constructor() {
		this.watchloads = 0;
		this.lastPos = {x: 0, y: 0, z: 0};
	}

	poststart() {
		fs.watch(ASSETS_DIR, { recursive: true }, this._fileChanged.bind(this));
		ig.game.addons.levelLoaded.push(this);
	}

	/**
	 *
	 * @param {string} event
	 * @param {string} assetPath
	 */
	async _fileChanged(event, assetPath) {
		assetPath = assetPath.replace(/\\/g, '/');
		if (!assetPath.endsWith(MAP_FILE_EXTENSION)) {
			return;
		}

		const fullFilePath = ASSETS_DIR + assetPath;
		if (!(await this._isFile(fullFilePath))) {
			return;
		}

		const mod = this._getModFromPath(fullFilePath);
		if (mod != null) {
			if (!fullFilePath.startsWith(mod.assetsDirectory)) {
				return;
			}
			assetPath = fullFilePath.slice(mod.assetsDirectory.length);
		}

		if (!assetPath.startsWith(MAPS_DIR)) {
			return;
		}

		if (mod != null) {
			ccmod3.resources.assetOverridesTable.set(assetPath, fullFilePath);
		}

		this._loadMap(assetPath);
	}

	/**
	 *
	 * @param {string} path
	 * @returns {Promise<boolean>}
	 */
	async _isFile(path) {
		try {
			return (await fsP.stat(path)).isFile();
		} catch (err) {
			if (err.code === 'ENOENT') return false;
			throw err;
		}
	}

	/**
	 *
	 * @param {string} fullFilePath
	 * @returns {{ assetsDirectory: string } | null}
	 */
	_getModFromPath(fullFilePath) {
		for (const mod of modloader.loadedMods.values()) {
			if (fullFilePath.startsWith(mod.baseDirectory)) {
				return mod;
			}
		}
		return null;
	}

	/**
	 *
	 * @param {string} filePath
	 */
	_loadMap(filePath) {
		const name = this._getMapName(filePath);
		if (ig.game.playerEntity && name === ig.game.mapName) {
			this.watchloads++;
			this.lastPos = ig.game.playerEntity.coll.pos;
			ig.game.setTeleportTime(0, 0);
			ig.game.teleport(name);
			ig.overlay.setAlpha(0);
		} else {
			ig.game.teleport(name);
		}
	}

	/**
	 *
	 * @param {string} assetPath
	 */
	_getMapName(assetPath) {
		return assetPath
			.slice(MAPS_DIR.length, assetPath.length - MAP_FILE_EXTENSION.length)
			.replace(/\//g, '.');
	}

	/**
	 *
	 * @returns {void}
	 */
	onLevelLoaded() {
		if (this.watchloads) {
			this.watchloads--;
			ig.game.playerEntity.setPos(this.lastPos.x, this.lastPos.y, this.lastPos.z);
		}
	}
}
