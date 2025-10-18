// src/app/routes.tsx
import { createBrowserRouter } from 'react-router-dom'
import App from './App'
import Home from '@/pages/Home'
import Shop from '@/pages/Shop'
import Cart from '@/pages/Cart'
import NotFound from '@/pages/NotFound'
import AdminLogin from '@/pages/AdminLogin'
import AdminProducts from '@/pages/AdminProducts'
import ProductDetails from '@/pages/ProductDetails'
import OrderSuccess from '@/pages/OrderSuccess'
 

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'order/success', element: <OrderSuccess /> },
      { path: 'shop', element: <Shop /> },
      { path: 'product/:id', element: <ProductDetails /> },
      { path: 'cart', element: <Cart /> },

      // admin
      { path: 'admin/login', element: <AdminLogin /> },
      { path: 'admin/products', element: <AdminProducts /> },
      

      { path: '*', element: <NotFound /> },
    ],
  },
])
