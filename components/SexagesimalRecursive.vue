<script>

// Based on the work of Lucien Khan
// See http://metatron216.co.za/
//
// The last digit of each fibonnaci number is an infinitely repeating 60 digit pattern.
// Wrap these around the geometry of the flower of life and see what happens.

import * as Three from 'three'
import PolygonClock from './PolygonClock'
import Vue from 'vue'

export default Vue.extend({
  mixins: [PolygonClock],
  data() {
    return {
      params: {
        geometry: {
          vertices: 60,
          unitRadius: 0.48 * (window.innerWidth < window.innerHeight ? window.innerWidth : window.innerHeight),
          pointRadius: 5,
          showPoly: false,
          showLabels: true,
          labelSize: 25,
          labelRadiusOffset: 20,
          zoom: 1
        }
      }
    }
  },
  methods: {
    init: function() {
      let colors = ['red','orange','yellow','green','blue','indigo','violet']
      let flower = this.$flowerPattern(new Three.Vector3(0,0,0), this.params.geometry.unitRadius, 1, 30)
      let labels = this._shiftLabels(this._fibonacciLabels(), this.params.geometry.vertices / 4)
      for (let i=0; i < flower.length; i++) {
        let poly = this.polyClock(labels, colors[i])
        let position = flower[i]
        poly.position.set(position.x, position.y, position.z)
        
        this.scene.add(poly)
      }
      this.camera.zoom = this.params.geometry.zoom
    },
    _fibonacciLabels: function() {
      let fib = [0, 1]
      let labels = []
      for (let i=0; i < this.params.geometry.vertices; i++) {
        if (i === 0) {
          fib[i] = 0
        } else if (i === 1) {
          fib[i] = 1
        } else {
          fib[i] = fib[i - 2] + fib[i - 1]
        }
        let digit = fib[i].toString().slice(-1)
        labels.push(digit)
      }
      return labels
    }
  }
})
</script>
