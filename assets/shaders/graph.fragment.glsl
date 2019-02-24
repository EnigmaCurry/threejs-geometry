//// This is a nunjucks template
uniform float iTime;
uniform vec2 iResolution;
uniform vec2 iCenter;
uniform float iZoom;
varying vec2 vUv;

#define PI 3.14159

/// Metaprogram of each function passed into the template:
{% for f in functions %}
float func_{{ loop.index0 }}(in float x) {
  return {{ f.def }};
}
float plot_{{ loop.index0 }}(in vec2 p) {
  // http://glslsandbox.com/e#52722.2
  const float e = 0.001;
  p.y -= func_{{ loop.index0 }}(p.x);
  float g = (func_{{ loop.index0 }}(p.x + e)
             - func_{{ loop.index0 }}(p.x - e)) / (PI * e);
  return abs(p.y * cos(atan(g)));
}
vec3 color_{{ loop.index0 }}(in vec2 p) {
  return {{ f.color }};
}
{% endfor %}

vec3 line(in float plot, in float strokeWidth, in vec3 color) {
  return vec3(smoothstep(strokeWidth / iZoom, 0.0, plot)) * color;
}

vec3 layer(in vec3 buf, in vec3 color) {
  if (color.r > 0.1 || color.g > 0.1 || color.b > 0.1) {
    return color;
  } else {
    return buf;
  }
}

void main(void)
{
  vec2 p = (vUv - 0.5 + iCenter) / (iZoom / 2.);
  if (iResolution.x > iResolution.y) {
    p.x *= iResolution.x/iResolution.y;
  } else {
    p.y *= iResolution.y/iResolution.x;
  }
  vec2 polar = vec2(length(p)* 2., atan(p.y, p.x));


  // Layer all functions passed into the template:
  vec3 buf = vec3(0.);
  vec2 coord = p;
  {% for f in functions %}
    {% if f.polar %}
    coord = polar.yx;
    {% endif %}
    buf = layer(buf, line(plot_{{ loop.index0 }}(coord),
                          {{ f.stroke * 0.001 }}, color_{{loop.index0}}(coord)));
  {% endfor %}

  if (buf.r > 0.1 || buf.g > 0.1 || buf.b > 0.1) {
    gl_FragColor = vec4(buf, 1.);
  } else {
    gl_FragColor = vec4(0.);
  }
}