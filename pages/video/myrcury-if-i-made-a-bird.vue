<template>
<video-player
  video="https://cdn.rymcg.tech/Video/MYRCURY/MYRCURY-if-i-made-a-bird_of_mystique_and_myrcury.mp4"/>
</template>

<style scoped>
video {
  pointer-events: auto;
}
</style>

<script>
import ScrollbarHide from '~/components/ScrollbarHide.vue'
import VideoPlayer from '~/components/scenes/video-player.vue'

export default {
  layout: 'renderer',
  mixins: [ScrollbarHide],
  components: {VideoPlayer},
}
</script>
