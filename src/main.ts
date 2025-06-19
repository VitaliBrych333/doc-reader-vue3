
import { createApp } from 'vue'
import { GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { VDateInput } from 'vuetify/labs/VDateInput'
import 'vuetify/styles'

import { BindOncePlugin } from 'vue-bind-once'
import '@mdi/font/css/materialdesignicons.css'
import './assets/main.css'
import router from './router'
import App from './App.vue'

const vuetify = createVuetify({
  components: {
    VDateInput,
    ...components
  },
  directives,
  display: {
    mobileBreakpoint: 'sm' // < 600px for v-navigation-drawer
  },
})

GlobalWorkerOptions.workerSrc = pdfWorker;

const app = createApp(App);

app.config.errorHandler = (err, vm, info) => {
  console.error("Error:", err);
  console.error("Vue component:", vm);
  console.error("Additional info:", info);
};

app.config.idPrefix = 'app-id';

app
  .use(router)
  .use(vuetify)
  .use(BindOncePlugin)
  .mount('#app')
