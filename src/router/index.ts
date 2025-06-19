import { createRouter, createWebHistory } from 'vue-router'
import type {
  RouteLocationNormalized,
  RouteLocationNormalizedLoaded,
  NavigationGuardNext
} from 'vue-router'

export const auth = async (
  to: RouteLocationNormalized,
  from: RouteLocationNormalizedLoaded,
  next: NavigationGuardNext,
) => {
  const objUser = localStorage.getItem(document.location.origin)
  const userId = objUser ? JSON.parse(objUser).user_Id : null

  if (userId) {
    next()
  } else {
    next('/login')
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      redirect: { name: 'login' },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue'),
    },
    {
      path: '/doc-reader',
      name: 'docReader',
      component: () => import('../views/DocReader.vue'),
      beforeEnter: auth,
    },
    {
      path: '/wrapped-view',
      name: 'wrappedView',
      component: () => import('../views/WrappedView.vue'),
      beforeEnter: auth,
    },
    {
      path: '/compare-view',
      name: 'compareView',
      component: () => import('../views/CompareView.vue'),
      beforeEnter: auth,
    },
    {
      path: '/edit-mode',
      name: 'editMode',
      component: () => import('../views/EditMode.vue'),
      beforeEnter: auth,
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      redirect: { name: 'login', params: {} },
    },
  ],
})

export default router
