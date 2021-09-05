import Vue from 'vue';
import Swal from 'sweetalert2';

import * as modelling from './modules/modelling';

interface UIModel {
  manifestFile: File | null,
  weightsFile: File | null,
  counter: number,
  isActive: boolean
}

const KFEdgeApp = Vue.extend({
  data(): UIModel {
    return {
      manifestFile: null,
      weightsFile: null,

      counter: 0,
      isActive: true,
    };
  },

  methods: {
    run() {
      modelling.run();
    },

    async run2() {
      if (!this.manifestFile || !this.weightsFile) {
        Swal.fire({
          title: 'No file choosen',
          text: 'Please upload your manifest and weights',
          icon: 'error',
        });

        return;
      }

      const result = await modelling.loadModel(this.manifestFile, this.weightsFile);
      const a = result.reduce((prev, current) => `${prev},${current}`, '');
      Swal.fire({
        title: 'Model uploaded!',
        text: `Model successfully loaded! Predicted: ${a}`,
        icon: 'success',
      });
    },

    modelManifestHandler() {
      const e = this.$refs.manifestFile as HTMLInputElement;
      if (!e.files?.length) return;
      this.manifestFile = e.files[0];
    },

    modelWeightsHandler() {
      const e = this.$refs.weightsFile as HTMLInputElement;
      if (!e.files?.length) return;
      this.weightsFile = e.files[0];
    },

    save() {
      modelling.save();
    },
  },
});

// eslint-disable-next-line no-new
new KFEdgeApp({ el: '#app' });
