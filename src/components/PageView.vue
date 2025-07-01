<script lang='ts'>
import { VuePDF } from '@tato30/vue-pdf';

export default {
  props: [
    'scale',
    'isCompareView',
    'isThumbnail',
    'annotations',
    'isLatestPageAllDocs',
    'isLastPageAllDocsLoaded',
    'page'
  ],

  emits: ['docsLoaded', 'clickPage'],

  components: {
    VuePDF
  },

  data() {
    return {
      rotate: 0,
      inProgress: true
    }
  },

  methods: {
    onLoaded() {
      this.inProgress = false

      if (this.isLatestPageAllDocs && !this.isLastPageAllDocsLoaded) {
        this.$emit('docsLoaded');
      }

      // this.drawArrow()
    },

    // for CompareView
    rotatePage(value: number) {
      this.rotate += value;

      if (this.rotate > 270 || this.rotate < -270) {
        this.rotate = 0;
      }
    },

    // example annotations
    // drawArrow() {
    //   const canvas = this.$refs.wrapperPage.lastChild.firstChild;
    //   const context = canvas.getContext('2d');
    //   const borderWidth = 3;
    //   const pointStart = {x: 30, y: 30}, pointEnd = {x: 40 + 50, y: 40 + 60};
    //   const TIP_WIDTH = 30 / 6;
    //   const TIP_HEIGHT = 40 / 6;
    //   const length = Math.sqrt((pointStart.x - pointEnd.x) * (pointStart.x - pointEnd.x) + (pointStart.y - pointEnd.y) * (pointStart.y - pointEnd.y));
    //   const angle = Math.atan2(pointEnd.y - pointStart.y, pointEnd.x - pointStart.x);

    //   context.save();
    //   context.strokeStyle = '#FF0000';
    //   context.fillStyle = '#FF0000';

    //   context.beginPath();

    //   if (this.isExternal) {
    //     context.setLineDash(this.externalBorderDashesStyle);
    //     context.strokeStyle = this.externalBorderColor;
    //   }

    //   context.lineWidth = borderWidth;
    //   context.translate(pointStart.x, pointStart.y);
    //   context.rotate(angle);
    //   context.moveTo(0, 0);

    //   if (length <= 3 * TIP_WIDTH) {
    //     const tip = TIP_HEIGHT / TIP_WIDTH * length / 3;

    //     context.lineTo(length * 2 / 3, -tip / 4);
    //     context.lineTo(length * 2 / 3, -tip / 2);
    //     context.lineTo(length, 0);
    //     context.lineTo(length * 2 / 3, tip / 2);
    //     context.lineTo(length * 2 / 3, tip / 4);
    //   } else {
    //     context.lineTo(length - TIP_WIDTH, -TIP_HEIGHT / 4);
    //     context.lineTo(length - TIP_WIDTH, -TIP_HEIGHT / 2);
    //     context.lineTo(length, 0);
    //     context.lineTo(length - TIP_WIDTH, TIP_HEIGHT / 2);
    //     context.lineTo(length - TIP_WIDTH, TIP_HEIGHT / 4);
    //   }

    //   context.lineTo(0, 0);
    //   context.stroke();
    //   context.fill();

    //   context.restore()
    // }
  },
}
</script>

<template>
  <div
    ref="wrapperPage"
    class="wrapper-page"
    :id="`${isThumbnail ? 'thumbnail-' : ''}${page.pageId}`"
    :class="inProgress ? 'progress' : ''"
    @click.stop="!inProgress && $emit('clickPage', $event, page.pageId)"
  >
    <div v-if="inProgress" class="spinner">
      <v-progress-circular
        color="blue-grey-darken-2"
        indeterminate
        size="50"
        width="5"
      ></v-progress-circular>
    </div>

    <VuePDF
      ref="vuePDFRef"
      :pdf="page.url"
      :page="page.originalNumPage"
      :rotation="isCompareView ? rotate : page.rotate"
      :scale="scale"
      :annotation-layer="annotations"
      @loaded="onLoaded"
    />
  </div>
</template>

<style scoped>
.active-page :not(.progress).wrapper-page, :not(.progress).wrapper-page:hover {
  -webkit-box-shadow: 0 10px 16px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19);
  -moz-box-shadow: 0 10px 16px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19);
  box-shadow: 0 10px 16px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19);
}

.active-page .wrapper-page {
  border: 3px solid #E53935 !important;
}

.edit-page .wrapper-page {
  opacity: 0.5;
}

.spinner {
  position: absolute;
  z-index: 9;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  -webkit-box-shadow: 0 10px 16px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19);
  -moz-box-shadow: 0 10px 16px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19);
  box-shadow: 0 10px 16px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19);
}

.spinner:hover {
  cursor: default;
}

</style>
