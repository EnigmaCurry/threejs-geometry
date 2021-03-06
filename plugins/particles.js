import Vue from 'vue';
import Random from 'random-js'
import Prob from 'prob.js'
import uuid from 'uuid/v4'
import PromiseWorker from 'promise-worker'
import ParticleLifeWorker from 'worker-loader!~/assets/script/particle-life.worker.js'
import {chunk} from 'lodash'

const $particles = Vue.prototype.$particles = { }
export {
  $particles
}

/// Particle Life adapted from https://github.com/fnky/particle-life
/// Copyright (c) 2018 Christian Petersen (https://cbp.io)
/// Copyright (c) 2018 HackerPoet
/// MIT - See ~/LICENSE

const RADIUS = 1
const DIAMETER = 2.0 * RADIUS
const R_SMOOTH = 2.0

const presets = $particles.presets = {
	Balanced: {
		population: [9, 400],
		seed: [-0.02, 0.06, 0.0, 20.0, 20.0, 70.0, 0.05, false]
	},
  Chaos: {
		population: [6, 400],
		seed: [0.02, 0.04, 0.0, 40.0, 30.0, 100.0, 0.01, false]
	},
	Diversity: {
		population: [12, 400],
		seed: [-0.01, 0.04, 0.0, 20.0, 10.0, 60.0, 0.05, true]
	},
	Frictionless: {
		population: [6, 300],
		seed: [0.01, 0.005, 10.0, 10.0, 10.0, 60.0, 0.0, true]
	},
	Gliders: {
		population: [6, 400],
		seed: [0.0, 0.06, 0.0, 20.0, 10.0, 50.0, 0.1, true]
	},
	Homogeneity: {
		population: [4, 400],
		seed: [0.0, 0.04, 10.0, 10.0, 10.0, 80.0, 0.05, true]
	},
	'Large Clusters': {
		population: [6, 400],
		seed: [0.025, 0.02, 0.0, 30.0, 30.0, 100.0, 0.2, false]
	},
	'Medium Clusters': {
		population: [6, 400],
		seed: [0.02, 0.05, 0.0, 20.0, 20.0, 50.0, 0.05, false]
	},
	Quiescence: {
		population: [6, 300],
		seed: [-0.02, 0.1, 10.0, 20.0, 20.0, 60.0, 0.2, false]
	},
	'Small Clusters': {
		population: [6, 600],
		seed: [-0.005, 0.01, 10.0, 10.0, 20.0, 50.0, 0.01, false]
	},
	Gliders2: {
		population: [6, 400],
		seed: [0.0, 0.06, 0.0, 20.0, 10.0, 50.0, 0.1, false]
	},
	Stringy: {
		population: [9, 400],
		seed: [-0.09, 0.06, 19.0, 20.0, 20.0, 72.0, 0.25, true]
	},
	Stringy2: {
		population: [4, 400],
		seed: [-0.04, 0.05, 19.0, 20.0, 21.0, 72.0, 0.25, false]
	},
	Stringy3: {
		population: [4, 400],
		seed: [-0.04, 0.05, 19.0, 20.0, 20.0, 72.0, 0.05, false]
	},
	Gitter: {
		population: [3, 300],
		seed: [-0.09, 1, 1.0, 20.0, 21, 60.0, 0.8, false]
	},
}

$particles.getSettingsForPreset = (preset) => {
	const { population, seed } = presets[preset]
	const [numTypes, numParticles] = population
	const [
		attractMean,
		attractStd,
		minRLower,
		minRUpper,
		maxRLower,
		maxRUpper,
		friction,
		flatForce
	] = seed

	return {
		numTypes,
		numParticles,
		attractMean,
		attractStd,
		minRLower,
		minRUpper,
		maxRLower,
		maxRUpper,
		friction,
		flatForce
	}
}

const resizeArray = (array, size, defaultValue) => {
  let delta = array.length - size
  if (delta > 0) {
    array.length = size
  } else {
    while (delta++ < 0) {
      array.push(defaultValue)
    }
  }
  return array
}

const colorFromHSV = (h, s, v) => {
  const i = Math.round(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)

  let r
  let g
  let b
  switch (i % 6) {
  case 0:
    r = v
    g = t
    b = p
    break
  case 1:
    r = q
    g = v
    b = p
    break
  case 2:
    r = p
    g = v
    b = t
    break
  case 3:
    r = p
    g = q
    b = v
    break
  case 4:
    r = t
    g = p
    b = v
    break
  case 5:
    r = v
    g = p
    b = q
    break
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  }
}

const makeParticle = $particles.makeParticle = ({x=0, y=0, vx=0, vy=0, type=0, sizePercentiles={0: 1}} = {}) => {
  let size = 1
  const randomRoll = Math.random()
  Object.keys(sizePercentiles).sort().forEach((percentile) => {
    if (randomRoll * 100 > percentile) {
      size = sizePercentiles[percentile]
    }
  })
  return { x, y, vx, vy, type, radius: size, mass: size, id: uuid()}
}

$particles.ParticleTypes = class ParticleTypes {
  constructor(size = 0) {
    this.colors = Array.from({ length: size }, () => ({ r: 0, g: 0, b: 0, a: 0 }))
    this.attract = Array(size * size).fill(0)
    this.minR = Array(size * size).fill(0)
    this.maxR = Array(size * size).fill(0)
  }

  resize(size) {
    resizeArray(this.colors, size, { r: 0, g: 0, b: 0, a: 0 })
    resizeArray(this.attract, size * size, 0)
    resizeArray(this.minR, size * size, 0)
    resizeArray(this.maxR, size * size, 0)
  }

  size() {
    return this.colors.length
  }

  getColor(i) {
    return this.colors[i]
  }

  setColor(i, value) {
    this.colors[i] = value
  }

  getAttract(i, j) {
    return this.attract[i * this.colors.length + j]
  }

  setAttract(i, j, value) {
    this.attract[i * this.colors.length + j] = value
  }

  getMinR(i, j) {
    return this.minR[i * this.colors.length + j]
  }

  setMinR(i, j, value) {
    this.minR[i * this.colors.length + j] = value
  }

  getMaxR(i, j) {
    return this.maxR[i * this.colors.length + j]
  }

  setMaxR(i, j, value) {
    this.maxR[i * this.colors.length + j] = value
  }
}

$particles.Universe = class Universe {
	constructor(settings) {
    this.settings = settings
    const {numTypes, numParticles, width, height, forceScale=1, range=null, wrap=false, sizePercentiles={0: 1}} = settings
		this.randGen = Random.engines.mt19937().seed(Date.now())
		this.types = new $particles.ParticleTypes()
		this.particles = Array.from({ length: numParticles }, () => makeParticle({sizePercentiles}))
    this.forceScale = forceScale

		this.setSize(width, height)
		this.setPopulation(numTypes, numParticles)
    this.range = range === null ? [0, numParticles] : range

		this.centerX = this.width * 0.5
		this.centerY = this.height * 0.5
		this.zoom = 1
		this.attractMean = 0
		this.attractStd = 0
		this.minRLower = 0
		this.minRUpper = 0
		this.maxRLower = 0
		this.maxRUpper = 0
		this.friction = 0
		this.flatForce = false
		this.wrap = wrap
    this.workers = []
    this.currentStep = 0
	}

	reSeed({
		attractMean,
		attractStd,
		minRLower,
		minRUpper,
		maxRLower,
		maxRUpper,
		friction,
		flatForce
	}) {
		this.attractMean = attractMean
		this.attractStd = attractStd
		this.minRLower = minRLower
		this.minRUpper = minRUpper
		this.maxRLower = maxRLower
		this.maxRUpper = maxRUpper
		this.friction = friction
		this.flatForce = flatForce
		this.setRandomTypes()
		this.setRandomParticles()
	}

	setPopulation(numTypes, numParticles) {
		this.types.resize(numTypes)
		resizeArray(this.particles, numParticles, makeParticle())
	}

	setSize(width, height) {
		this.width = width
		this.height = height
	}

	setRandomTypes() {
		const randAttr = Prob.normal(this.attractMean, this.attractStd)
		const randMinR = Prob.uniform(this.minRLower, this.minRUpper)
		const randMaxR = Prob.uniform(this.maxRLower, this.maxRUpper)

		for (let i = 0; i < this.types.size(); ++i) {
			this.types.setColor(
				i,
				colorFromHSV(i / this.types.size(), 1, (i % 2) * 0.5 + 0.5)
			)

			for (let j = 0; j < this.types.size(); ++j) {
				if (i === j) {
					this.types.setAttract(i, j, -Math.abs(randAttr(this.randGen)))
					this.types.setMinR(i, j, DIAMETER)
				} else {
					this.types.setAttract(i, j, randAttr(this.randGen))
					this.types.setMinR(i, j, Math.max(randMinR(this.randGen), DIAMETER))
				}

				this.types.setMaxR(
					i,
					j,
					Math.max(randMaxR(this.randGen), this.types.getMinR(i, j))
				)

				// Keep radii symmetric
				this.types.setMaxR(j, i, this.types.getMaxR(i, j))
				this.types.setMinR(j, i, this.types.getMinR(i, j))
			}
		}
	}

	setRandomParticles() {
		const randType = Prob.uniform(0, this.types.size() - 1)
		const randUni = Prob.uniform(0, 1)
		const randNorm = Prob.normal(0, 1)

		for (let i = 0; i < this.particles.length; ++i) {
			const p = this.particles[i]
			p.type = Math.round(randType(this.randGen))
			p.x = (randUni(this.randGen) * 0.5 + 0.25) * this.width
			p.y = (randUni(this.randGen) * 0.5 + 0.25) * this.height
			p.vx = randNorm(this.randGen) * 0.2
			p.vy = randNorm(this.randGen) * 0.2
		}
	}

  brokeredStep() {
    const numWorkers = 2 // navigator.hardwareConcurrency
    const chunks = chunk(Array.from({length: this.particles.length}, (x,i) => i),
                         Math.ceil(this.particles.length / numWorkers) )
    const promises = []
    if (this.workers.length != numWorkers) {
      this.workers = []
      for (let w=0; w < numWorkers; w++) {
        this.workers.push(new PromiseWorker(new ParticleLifeWorker()))
        promises.push(this.workers[w].postMessage({
          action: "newUniverse",
          settings: Object.assign({}, this.settings, {range:[chunks[w][0], chunks[w][chunks[w].length - 1]]})
        }))
      }
      return Promise.all(promises)
    } else {
      for(let w = 0; w < this.workers.length; w++) {
        promises.push(this.workers[w].postMessage("Hello"))
      }
      return Promise.all(promises).then(values => {
        let i = 0
        for(let x=0; x < values.length; x++) {
          for(let v=0; v < values[x].length; v++) {
            this.particles[i++] = values[x][v]
          }
        }
      })
    }
  }

	step(particles) {
    if (particles) {
      this.particles = particles
    }
		for (let i = this.range[0]; i < this.range[1]; ++i) {
			// Current particle
			const p = this.particles[i]

			// Interactions
			for (let j = 0; j < this.particles.length; ++j) {
				// Other particle
				const q = this.particles[j]

				// Get deltas
				let dx = q.x - p.x
				let dy = q.y - p.y

				if (this.wrap) {
					if (dx > this.width * 0.5) {
						dx -= this.width
					} else if (dx < -this.width * 0.5) {
						dx += this.width
					}

					if (dy > this.height * 0.5) {
						dy -= this.height
					} else if (dy < -this.height * 0.5) {
						dy += this.height
					}
				}

				// Get distance squared
				const r2 = dx * dx + dy * dy
				const minR = this.types.getMinR(p.type, q.type)
				const maxR = this.types.getMaxR(p.type, q.type)

				if (r2 > maxR * maxR || r2 < 0.01) {
					continue
				}

				// Normalize displacement
				const r = Math.sqrt(r2)
				dx /= r
				dy /= r

				// Calculate force
				let f = 0.0
				if (r > minR) {
					if (this.flatForce) {
						f = this.types.getAttract(p.type, q.type)
					} else {
						const numer = 2.0 * Math.abs(r - 0.5 * (maxR + minR))
						const denom = maxR - minR
						f = this.types.getAttract(p.type, q.type) * (1.0 - numer / denom)
					}
				} else {
					f =
						R_SMOOTH * minR * (1.0 / (minR + R_SMOOTH) - 1.0 / (r + R_SMOOTH))
				}

				p.vx += f * dx * this.forceScale * p.mass
				p.vy += f * dy * this.forceScale * p.mass
			}

			this.particles[i] = p
		}

		// Update position
		for (let i = 0; i < this.particles.length; ++i) {
			// Current particle
			const p = this.particles[i]

			// Update position and velocity
			p.x += p.vx
			p.y += p.vy
			p.vx *= (1.0 - this.friction) / p.mass
			p.vy *= (1.0 - this.friction) / p.mass

			// Check for wall collisions
			if (this.wrap) {
				if (p.x < 0) {
					p.x += this.width
				} else if (p.x >= this.width) {
					p.x -= this.width
				}

				if (p.y < 0) {
					p.y += this.height
				} else if (p.y >= this.height) {
					p.y -= this.height
				}
			} else {
				if (p.x < DIAMETER) {
					p.vx = -p.vx
					p.x = DIAMETER
				} else if (p.x >= this.width - DIAMETER) {
					p.vx = -p.vx
					p.x = this.width - DIAMETER
				}

				if (p.y < DIAMETER) {
					p.vy = -p.vy
					p.y = DIAMETER
				} else if (p.y >= this.height - DIAMETER) {
					p.vy = -p.vy
					p.y = this.height - DIAMETER
				}
			}

			this.particles[i] = p
		}
	}

	getIndex(x, y) {
		const [cx, cy] = this.toCenter(x, y)

		for (let i = 0; i < this.particles.length; ++i) {
			const dx = this.particles[i].x - cx
			const dy = this.particles[i].y - cy

			if (dx * dx + dy * dy < RADIUS * RADIUS) {
				return i
			}
		}

		return -1
	}

	getParticleX(index) {
		return this.particles[index].x
	}

	getParticleY(index) {
		return this.particles[index].y
	}

	toCenter(x, y) {
		const cx = this.centerX + (x - this.width / 2) / this.zoom
		const cy = this.centerY + (y - this.height / 2) / this.zoom
		return [cx, cy]
	}

	setZoom(cx, cy, zoom) {
		// Apply the zoom
		this.centerX = cx
		this.centerY = cy
		this.zoom = Math.max(1, zoom)

		// Clamp to make sure camera doesn't go out of bounds
		this.centerX = Math.min(this.centerX, this.width * (1.0 - 0.5 / this.zoom))
		this.centerY = Math.min(
			this.centerY,
			this.height * (1.0 - 0.5 / this.zoom)
		)
		this.centerX = Math.min(this.centerX, this.width * (0.5 / this.zoom))
		this.centerY = Math.min(this.centerY, this.height * (0.5 / this.zoom))
	}

	printParams() {
		console.log('Attract:')
		for (let i = 0; i < this.types.size(); ++i) {
			for (let j = 0; j < this.types.size(); ++j) {
				console.log(this.types.getAttract(i, j))
			}
			console.log('')
		}

		console.log('MinR:')
		for (let i = 0; i < this.types.size(); ++i) {
			for (let j = 0; j < this.types.size(); ++j) {
				console.log(this.types.getMinR(i, j))
			}
			console.log('')
		}

		console.log('MaxR:')
		for (let i = 0; i < this.types.size(); ++i) {
			for (let j = 0; j < this.types.size(); ++j) {
				console.log(this.types.getMaxR(i, j))
			}
			console.log('')
		}
	}

  getRange() {
    return this.particles.slice(this.range[0], this.range[1])
  }
}
