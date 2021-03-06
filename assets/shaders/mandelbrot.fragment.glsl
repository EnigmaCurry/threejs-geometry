uniform vec2 iResolution;
uniform float iGlobalTime;
uniform vec2 center;
uniform float zoom;
uniform float colt;

#define iterLimit 256.
#define black vec4(0.,0.,0.,1.)

varying vec2 vUv;


vec4 colmod1 (float iter, float t) {
  float col = iter / iterLimit;
  vec2 p = vUv - 0.5;
  if (col > 0.99) {
    return black;
  } else {
    return vec4(col * 0.00002 + cos(t /45. * iter) + 0.15 * p.x,
                col * 0.00001 + cos(t /111. * iter) + 0.15 * p.x,
                col * 0.00005 + tan(t / 555. + iter ) + 0.15 * p.x,
                1.0);
  }
}

vec4 colmod2 (float iter, float t) {
  float col = iter / iterLimit;
  vec2 p = vUv - 0.5;
  if (col > 0.99) {
    return black;
  } else {
    return vec4(col * 0.00002 + cos(t /33. * iter) + 0.15 * p.x,
                col * 0.00003 + cos(t /444. * iter) + 0.15 * p.x,
                col * 0.00005 + tan(t / 555. + iter ) + 0.15 * p.x,
                1.0);
  }
}

vec4 colmod3 (float iter, float t) {
  float col = iter / iterLimit;
  vec2 p = vUv - 0.5;
  if (col > 0.99) {
    return black;
  } else {
    return vec4(col * 0.00002 + cos(t /2222. * iter) + 0.15 * p.x,
                col * 0.00001 + cos(t /1333. * iter) + 0.15 * p.x,
                col * 0.00005 + tan(t /884. + iter ) + 0.15 * p.x,
                1.0);
  }
}

vec4 mandelbrot(vec2 center, float zoom, float t) {
  vec2 p = vUv - 0.5;
  p.x *= iResolution.x / iResolution.y;
  vec2 c = center + p  / zoom;

  vec2 z;
  float iter;
  for (float i=0.; i < iterLimit; i+=1.) {
    iter = i;
    z = vec2(z.x*z.x-z.y*z.y, 2.*z.x*z.y) + c;
    if (length(z) > 2.) {
      break;
    }
  }
  //apply coloring as function of t:
  float m = mod(t,390.);
  if (m < 100.) {
    return colmod1(iter, t);
  } else if (m < 130.) {
    return mix(colmod1(iter, t), colmod2(iter, t), (m-100.)/30.);
  } else if (m < 230.) {
    return colmod2(iter, t);
  } else if (m < 260.) {
    return mix(colmod2(iter, t), colmod3(iter, t), (m-230.)/30.);
  } else if (m < 360.) {
    return colmod3(iter, t);
  } else {
    return mix(colmod3(iter, t), colmod1(iter, t), (m-360.)/30.);
  }
}

void main(void)
{
  // Use uniforms as input parameters
  // center - the the coordinates of the center of focus
  // zoom - factor of zoom
  // colt - factor of time for color changes
  gl_FragColor = mandelbrot(center, zoom, iGlobalTime * colt);
}

