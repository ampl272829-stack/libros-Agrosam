const CONFIG = {
  password: 'admin123',
  whatsapp: '584121234567',
  instagram: 'moafoodpizzeria',
  telefono: '+58 412-1234567',
  direccion: 'Maracay, Aragua (Google Maps)',
  horario: 'Lun a Sáb 9:00 - 21:30',
  coordenadas: { lat: 10.2603422, lng: -67.6230031 }
};

const CATEGORIAS = ['Pizzas', 'Postres', 'Bebidas', 'Combos'];

const ICONOS_INGREDIENTES = {
  'Mozzarella': '🧀',
  'Queso': '🧀',
  'Pepperoni': '🥓',
  'Jamón': '🥩',
  'Pollo': '🍗',
  'Piña': '🍍',
  'Champiñones': '🍄',
  'Pimentón': '🫑',
  'Cebolla': '🧅',
  'Tomate': '🍅',
  'Albahaca': '🌿',
  'Salsa BBQ': '🫗',
  'Salsa de tomate': '🍅',
  'Ajo': '🧄',
  'Aceitunas': '🫒',
  'Orégano': '🌿',
  'Huevo': '🥚',
  'Carne molida': '🥩',
  'Tocineta': '🥓',
  'Maíz': '🌽',
  'Rúcula': '🥬',
  'Parmesano': '🧀',
  'Gorgonzola': '🧀',
  'Queso de cabra': '🧀',
  'Chocolate': '🍫',
  'Fresas': '🍓',
  'Helado': '🍦',
  'Brownie': '🍪',
  'Frutas': '🍇',
  'Crema chantilly': '🥛',
  'Vainilla': '🍦',
  'Leche': '🥛',
  'Agua': '💧',
  'Polar': '🍺',
  'Malta': '🍺',
  'Papelón': '🍯',
  'Limón': '🍋',
  'Naranja': '🍊',
  'Parchita': '🫐',
  'Mango': '🥭'
};

const MENU = [
  {
    categoria: 'Pizzas',
    imagen_categoria: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&h=400&fit=crop',
    descripcion_categoria: 'Masa delgada y crujiente horneada en horno de piedra',
    items: [
      { id: 'p1', nombre: 'Pizza Margarita', descripcion: 'La clásica italiana con los mejores ingredientes', precio: 8.50, img: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&h=400&fit=crop', ingredientes: ['Mozzarella', 'Tomate', 'Albahaca', 'Orégano'], popular: true },
      { id: 'p2', nombre: 'Pizza Pepperoni', descripcion: 'La favorita de todos con pepperoni importado', precio: 10.00, img: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&h=400&fit=crop', ingredientes: ['Mozzarella', 'Pepperoni', 'Salsa de tomate', 'Orégano'], popular: true },
      { id: 'p3', nombre: 'Pizza Tropical', descripcion: 'El sabor caribeño en cada mordisco', precio: 11.00, img: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=400&fit=crop', ingredientes: ['Mozzarella', 'Jamón', 'Piña', 'Salsa de tomate'] },
      { id: 'p4', nombre: 'Pizza Vegetariana', descripcion: 'Fresca, ligera y llena de color', precio: 10.50, img: 'https://images.unsplash.com/photo-1604917877934-07d8d248d396?w=600&h=400&fit=crop', ingredientes: ['Mozzarella', 'Champiñones', 'Pimentón', 'Cebolla', 'Aceitunas'] },
      { id: 'p5', nombre: 'Pizza BBQ Pollo', descripcion: 'El ahumado de la BBQ con pollo jugoso', precio: 12.00, img: 'https://images.unsplash.com/photo-1566843972142-a8fc0d5f2c7e?w=600&h=400&fit=crop', ingredientes: ['Pollo', 'Salsa BBQ', 'Cebolla', 'Mozzarella', 'Tocineta'], popular: true },
      { id: 'p6', nombre: 'Pizza 4 Quesos', descripcion: 'Para los verdaderos amantes del queso', precio: 12.50, img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&h=400&fit=crop', ingredientes: ['Mozzarella', 'Gorgonzola', 'Parmesano', 'Queso de cabra'] },
      { id: 'p7', nombre: 'Pizza Hawaiana', descripcion: 'Dulce y salada, la combinación perfecta', precio: 11.50, img: 'https://images.unsplash.com/photo-1594007654729-407eedc4be65?w=600&h=400&fit=crop', ingredientes: ['Mozzarella', 'Jamón', 'Piña', 'Salsa de tomate'] },
      { id: 'p8', nombre: 'Pizza Mexicana', descripcion: 'Un toque picante con ingredientes únicos', precio: 12.00, img: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&h=400&fit=crop', ingredientes: ['Carne molida', 'Tocineta', 'Cebolla', 'Pimentón', 'Maíz', 'Mozzarella'] }
    ]
  },
  {
    categoria: 'Postres',
    imagen_categoria: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&h=400&fit=crop',
    descripcion_categoria: 'El toque dulce que completa tu experiencia',
    items: [
      { id: 'po1', nombre: 'Salpicón + 1 Helado', descripcion: 'Salpicón de frutas con una porción de helado', precio: 7.50, img: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=600&h=400&fit=crop', ingredientes: ['Frutas', 'Helado', 'Crema chantilly'] },
      { id: 'po2', nombre: 'Salpicón + 2 Helados', descripcion: 'Salpicón de frutas con dos porciones de helado', precio: 10.50, img: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=600&h=400&fit=crop', ingredientes: ['Frutas', 'Helado', 'Crema chantilly', 'Chocolate'] },
      { id: 'po3', nombre: 'Ensalada de Frutas Personal', descripcion: 'Ensalada de frutas frescas tamaño personal', precio: 11.00, img: 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=600&h=400&fit=crop', ingredientes: ['Frutas', 'Crema chantilly'] },
      { id: 'po4', nombre: 'Ensalada de Frutas Jumbo', descripcion: 'Ensalada de frutas frescas tamaño jumbo', precio: 18.50, img: 'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=600&h=400&fit=crop', ingredientes: ['Frutas', 'Crema chantilly', 'Chocolate'] },
      { id: 'po5', nombre: 'Copa Helado Brownie', descripcion: 'Copa de helado con brownie y toppings', precio: 14.00, img: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&h=400&fit=crop', ingredientes: ['Helado', 'Brownie', 'Chocolate', 'Crema chantilly'] },
      { id: 'po6', nombre: 'Fresas con Chantilly', descripcion: 'Fresas frescas bañadas en crema chantilly', precio: 14.00, img: 'https://images.unsplash.com/photo-1600359088074-8e9d12e5fbb2?w=600&h=400&fit=crop', ingredientes: ['Fresas', 'Crema chantilly'] },
      { id: 'po7', nombre: 'Waffle Tentación', descripcion: 'Waffle con helado, chocolate y frutas', precio: 16.00, img: 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=600&h=400&fit=crop', ingredientes: ['Chocolate', 'Helado', 'Frutas', 'Crema chantilly'] },
      { id: 'po8', nombre: 'Malteada Paraíso', descripcion: 'Malteada cremosa con toppings y frutas', precio: 17.00, img: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&h=400&fit=crop', ingredientes: ['Helado', 'Leche', 'Chocolate', 'Frutas'] },
      { id: 'po9', nombre: 'Banana Split Especial', descripcion: 'Banana split con queso y helado artesanal', precio: 17.00, img: 'https://images.unsplash.com/photo-1681859079217-b6cab6f96a38?w=600&h=400&fit=crop', ingredientes: ['Helado', 'Fresas', 'Chocolate', 'Crema chantilly'] },
      { id: 'po10', nombre: 'Frappe Ilusión', descripcion: 'Frappe cremoso con toppings decorativos', precio: 15.00, img: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&h=400&fit=crop', ingredientes: ['Helado', 'Leche', 'Chocolate', 'Crema chantilly'] }
    ]
  },
  {
    categoria: 'Bebidas',
    imagen_categoria: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=800&h=400&fit=crop',
    descripcion_categoria: 'Refresca tu paladar con nuestras bebidas',
    items: [
      { id: 'b1', nombre: 'Coca-Cola Personal', descripcion: 'Lata 355ml bien fría', precio: 1.50, img: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=600&h=400&fit=crop', ingredientes: [] },
      { id: 'b2', nombre: 'Coca-Cola 2L', descripcion: 'Botella familiar 2 litros', precio: 3.00, img: 'https://images.unsplash.com/photo-1629203851122-3726ec8b81a0?w=600&h=400&fit=crop', ingredientes: [] },
      { id: 'b3', nombre: 'Jugo Natural de Frutas', descripcion: 'Naranja, parchita o limón — recién exprimido', precio: 2.50, img: 'https://images.unsplash.com/photo-1622597467836-f3aad1f67b8c?w=600&h=400&fit=crop', ingredientes: ['Naranja', 'Parchita', 'Limón'] },
      { id: 'b4', nombre: 'Agua Mineral', descripcion: 'Botella 500ml — pura y refrescante', precio: 1.00, img: 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=600&h=400&fit=crop', ingredientes: ['Agua'] },
      { id: 'b5', nombre: 'Malta Polar', descripcion: 'Lata 355ml — la tradicional', precio: 2.00, img: 'https://images.unsplash.com/photo-1586974735669-7d9c6c8ba459?w=600&h=400&fit=crop', ingredientes: ['Malta'] },
      { id: 'b6', nombre: 'Papelón con Limón', descripcion: 'Refrescante bebida tradicional venezolana', precio: 2.00, img: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600&h=400&fit=crop', ingredientes: ['Papelón', 'Limón'] }
    ]
  },
  {
    categoria: 'Combos',
    imagen_categoria: 'https://images.unsplash.com/photo-MqT0asuoIcU?w=800&h=400&fit=crop',
    descripcion_categoria: 'La mejor combinación para compartir en familia',
    items: [
      { id: 'c1', nombre: 'Combo Familiar', descripcion: '2 Pizzas grandes + 1 Ensalada + 2 Malteadas', precio: 35.00, img: 'https://images.unsplash.com/photo-MqT0asuoIcU?w=600&h=400&fit=crop', ingredientes: ['Pizza', 'Ensalada', 'Malteada'], popular: true },
      { id: 'c2', nombre: 'Combo Pareja', descripcion: '1 Pizza grande + 2 Copas de helado + 2 Bebidas', precio: 22.00, img: 'https://images.unsplash.com/photo-MQUqbmszGGM?w=600&h=400&fit=crop', ingredientes: ['Pizza', 'Helado', 'Bebidas'] },
      { id: 'c3', nombre: 'Combo Infantil', descripcion: '1 Pizza personal + 1 Postre + 1 Jugo', precio: 12.00, img: 'https://images.unsplash.com/photo-NzHRSLhc6Cs?w=600&h=400&fit=crop', ingredientes: ['Pizza', 'Postre', 'Jugo'] },
      { id: 'c4', nombre: 'Combo Postres', descripcion: '2 Salpicones + 2 Waffles + 2 Malteadas', precio: 30.00, img: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=600&h=400&fit=crop', ingredientes: ['Salpicón', 'Waffle', 'Malteada'] }
    ]
  }
];

const RESENAS = [
  { nombre: 'María G.', estrellas: 5, texto: 'Las mejores pizzas de Maracay. La masa es delgada y crocante, ingredientes frescos. ¡Súper recomendada!', fecha: '15/06/2026' },
  { nombre: 'Carlos M.', estrellas: 5, texto: 'El salpicón es espectacular, los helados artesanales son una delicia. El ambiente es muy agradable.', fecha: '02/06/2026' },
  { nombre: 'Ana L.', estrellas: 4, texto: 'Buenísimo el combo familiar, rinde para 4 personas. La pizza tropical es mi favorita.', fecha: '28/05/2026' },
  { nombre: 'José R.', estrellas: 5, texto: 'Excelente atención y la comida es de primera. Los precios son justos. Volveré sin duda.', fecha: '15/05/2026' },
  { nombre: 'Laura P.', estrellas: 4, texto: 'Los waffles son increíbles. El lugar es acogedor, ideal para ir en familia.', fecha: '03/05/2026' }
];

const GALERIA = [
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1552539618-7eec9b4d3c24?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&h=400&fit=crop'
];
