const productos = [
  {
    id: 'cargador-20w',
    nombre: 'Cargador USB-C 20W',
    descripcion: 'Cargador rápido para iPhone 15 y modelos anteriores',
    descripcionLarga: 'Cargador compacto de 20W con puerto USB-C. Carga tu iPhone hasta un 50% en solo 30 minutos. Compatible con todos los modelos de iPhone desde el 8 en adelante. Diseño compacto ideal para llevar a cualquier parte. Incluye protección contra sobrecarga, cortocircuito y sobrecalentamiento.',
    precio: 15.99,
    categoria: 'cargadores',
    img: 'img/cargador-20w.svg',
    imagenes: ['img/cargador-20w.svg', 'img/cargador-20w-2.svg', 'img/cargador-20w-3.svg'],
  },
  {
    id: 'cargador-dual',
    nombre: 'Cargador Dual 40W',
    descripcion: 'Cargador de pared con 2 puertos USB-C, carga rápida simultánea',
    descripcionLarga: 'Cargador dual de 40W con dos puertos USB-C que permite cargar dos dispositivos al mismo tiempo a máxima velocidad. Ideal si tienes un iPhone y unos AirPods, o un iPhone y un iPad. Tecnología GaN para un tamaño más compacto y menor calor. Carga rápida compatible con Power Delivery.',
    precio: 22.99,
    categoria: 'cargadores',
    img: 'img/cargador-dual.svg',
    imagenes: ['img/cargador-dual.svg', 'img/cargador-dual-2.svg', 'img/cargador-dual-3.svg'],
  },
  {
    id: 'cargador-coche',
    nombre: 'Cargador para Coche 30W',
    descripcion: 'Cargador rápido para auto con puerto USB-C y Lightning',
    descripcionLarga: 'Cargador de automóvil con 30W de potencia y doble puerto. Compatible con iPhone, Android y cualquier dispositivo USB. Diseño compacto que no sobresale. Carga rápida mientras usas GPS o reproduces música. Protección contra picos de voltaje del auto.',
    precio: 13.99,
    categoria: 'cargadores',
    img: 'img/cargador-coche.svg',
    imagenes: ['img/cargador-coche.svg', 'img/cargador-coche-2.svg', 'img/cargador-coche-3.svg'],
  },
  {
    id: 'cable-lightning',
    nombre: 'Cable Lightning 2m',
    descripcion: 'Cable trenzado resistente, certificado MFi',
    descripcionLarga: 'Cable Lightning de 2 metros con certificación MFi (Made for iPhone). Trenzado en nylon para máxima durabilidad. Resistente a enredos y nudos. Carga sincronizada con velocidad completa. Compatible con todos los dispositivos Lightning. Conectores reforzados para evitar desgarres.',
    precio: 9.99,
    categoria: 'cables',
    img: 'img/cable-lightning.svg',
    imagenes: ['img/cable-lightning.svg', 'img/cable-lightning-2.svg', 'img/cable-lightning-3.svg'],
  },
  {
    id: 'cable-usbc',
    nombre: 'Cable USB-C a USB-C 2m',
    descripcion: 'Cable rápido 60W, trenzado, compatible con iPhone 15',
    descripcionLarga: 'Cable USB-C a USB-C de 2 metros con soporte para carga rápida de hasta 60W. Compatible con iPhone 15, iPad Pro, MacBook y cualquier dispositivo USB-C. Trenzado en nylon de alta resistencia. Transfiere datos a 480Mbps. Ideal para carga de laptops y tablets.',
    precio: 11.99,
    categoria: 'cables',
    img: 'img/cable-usbc.svg',
    imagenes: ['img/cable-usbc.svg', 'img/cable-usbc-2.svg', 'img/cable-usbc-3.svg'],
  },
  {
    id: 'cable-3en1',
    nombre: 'Cable 3 en 1 1.2m',
    descripcion: 'Cable con Lightning, USB-C y Micro USB, ideal para viajes',
    descripcionLarga: 'Cable multifuncional 3 en 1 con conectores Lightning, USB-C y Micro USB integrados en un solo cable. Perfecto para llevar un solo cable y cargar cualquier dispositivo. Compatible con iPhone, Android, audífonos, parlantes y más. Longitud de 1.2 metros, ideal para viajes.',
    precio: 14.99,
    categoria: 'cables',
    img: 'img/cable-3en1.svg',
    imagenes: ['img/cable-3en1.svg', 'img/cable-3en1-2.svg', 'img/cable-3en1-3.svg'],
  },
  {
    id: 'funda-silicona',
    nombre: 'Funda de Silicona',
    descripcion: 'Funda suave al tacto, protección completa contra golpes',
    descripcionLarga: 'Funda de silicona de alta calidad con acabado suave al tacto. Protege tu iPhone contra caídas y golpes con bordes reforzados y elevación para la cámara. Disponible en múltiples colores. No se desliza de las manos. Fácil de poner y quitar sin rayones.',
    precio: 12.99,
    categoria: 'fundas',
    img: 'img/funda-silicona.svg',
    imagenes: ['img/funda-silicona.svg', 'img/funda-silicona-2.svg', 'img/funda-silicona-3.svg'],
  },
  {
    id: 'funda-transparente',
    nombre: 'Funda Transparente Antiamarillento',
    descripcion: 'Funda ultra delgada que no se vuelve amarilla con el tiempo',
    descripcionLarga: 'Funda transparente ultradelgada con tecnología antiamarillento. Tratamiento UV especial que mantiene la funda cristalina por más tiempo. Diseño delgado que no añade volumen. Botones táctiles de respuesta precisa. Ideal para lucir el diseño original de tu iPhone.',
    precio: 10.99,
    categoria: 'fundas',
    img: 'img/funda-transparente.svg',
    imagenes: ['img/funda-transparente.svg', 'img/funda-transparente-2.svg', 'img/funda-transparente-3.svg'],
  },
  {
    id: 'funda-billetera',
    nombre: 'Funda Billetera con Ranuras',
    descripcion: 'Funda con espacio para tarjetas y efectivo, cierre magnético',
    descripcionLarga: 'Funda tipo billetera con compartimentos para hasta 3 tarjetas y efectivo. Cierre magnético de alta resistencia que mantiene todo seguro. Fabricada en cuero sintético premium. Protege la pantalla cuando está cerrada. Ideal para salir sin cartera.',
    precio: 16.99,
    categoria: 'fundas',
    img: 'img/funda-billetera.svg',
    imagenes: ['img/funda-billetera.svg', 'img/funda-billetera-2.svg', 'img/funda-billetera-3.svg'],
  },
  {
    id: 'vidrio-templado',
    nombre: 'Vidrio Templado 2 Pack',
    descripcion: 'Protección de pantalla 9H, anti huellas, fácil instalación',
    descripcionLarga: 'Pack de 2 vidrios templados con dureza 9H para máxima protección de pantalla. Capa oleofóbica anti huellas que mantiene la pantalla limpia. Instalación fácil con marco guía incluido. Borde redondeado 2.5D que no se siente al tacto. Precisión milimétrica para cada modelo.',
    precio: 7.99,
    categoria: 'proteccion',
    img: 'img/vidrio-templado.svg',
    imagenes: ['img/vidrio-templado.svg', 'img/vidrio-templado-2.svg', 'img/vidrio-templado-3.svg'],
  },
  {
    id: 'cargador-inalambrico',
    nombre: 'Base Carga Inalámbrica 15W',
    descripcion: 'Cargador Qi rápido, compatible con MagSafe',
    descripcionLarga: 'Base de carga inalámbrica con 15W de potencia. Compatible con todos los iPhones con carga inalámbrica (8 en adelante) y con MagSafe. Carga también AirPods y dispositivos Android con Qi. Diseño antideslizante con LED indicador. Protección contra sobrecalentamiento.',
    precio: 19.99,
    categoria: 'inalambrico',
    img: 'img/cargador-inalambrico.svg',
    imagenes: ['img/cargador-inalambrico.svg', 'img/cargador-inalambrico-2.svg', 'img/cargador-inalambrico-3.svg'],
  },
  {
    id: 'powerbank-10000',
    nombre: 'Power Bank 10000mAh',
    descripcion: 'Batería portátil delgada, carga rápida PD 20W',
    descripcionLarga: 'Batería externa de 10000mAh con carga rápida Power Delivery de 20W. Suficiente para cargar un iPhone más de 2 veces. Diseño delgado y liviano que cabe en cualquier bolsillo. Puertos USB-C y USB-A para cargar múltiples dispositivos. Indicador LED de batería restante.',
    precio: 29.99,
    categoria: 'baterias',
    img: 'img/powerbank-10000.svg',
    imagenes: ['img/powerbank-10000.svg', 'img/powerbank-10000-2.svg', 'img/powerbank-10000-3.svg'],
  },
  {
    id: 'cargador-tecno',
    nombre: 'Cargador Tecno Fast Charge',
    descripcion: 'Carga rápida para Tecno y dispositivos Android',
    descripcionLarga: 'Cargador con carga rápida compatible con celulares Tecno, Infinix e Itel y cualquier dispositivo Android con puerto USB. Diseño compacto que no estorba en el tomacorriente y es fácil de llevar. Incluye protección contra sobrecarga, cortocircuito y sobrecalentamiento para cuidar la batería de tu equipo.',
    precio: 11.99,
    categoria: 'cargadores',
    img: 'img/cargador-tecno.svg',
    imagenes: ['img/cargador-tecno.svg', 'img/cargador-tecno.svg', 'img/cargador-tecno.svg'],
  },
  {
    id: 'cargador-iphone-lightning',
    nombre: 'Cargador iPhone Lightning',
    descripcion: 'Cargador para iPhone con conector Lightning, sin USB-C',
    descripcionLarga: 'Cargador clásico para iPhone con conector Lightning integrado, compatible con todos los modelos de iPhone con puerto Lightning (del 5 al 14 y versiones anteriores). Carga estable y segura con protección contra sobrecarga y sobrecalentamiento. Longitud ideal para cargar desde el sofá o la mesita de noche.',
    precio: 14.99,
    categoria: 'cargadores',
    img: 'img/cargador-iphone-lightning.svg',
    imagenes: ['img/cargador-iphone-lightning.svg', 'img/cargador-iphone-lightning.svg', 'img/cargador-iphone-lightning.svg'],
  },
];

const CATEGORIAS = [
  { id: 'todos', nombre: 'Todos' },
  { id: 'cargadores', nombre: 'Cargadores' },
  { id: 'cables', nombre: 'Cables' },
  { id: 'fundas', nombre: 'Fundas' },
  { id: 'proteccion', nombre: 'Protección' },
  { id: 'inalambrico', nombre: 'Inalámbrico' },
  { id: 'baterias', nombre: 'Baterías' },
];

function aplicarOverridesTienda() {
  try {
    const over = JSON.parse(localStorage.getItem('ms_store_overrides') || '{}');
    productos.forEach(p => {
      const o = over[p.id];
      if (o) {
        p.visible = o.visible !== undefined ? o.visible !== false : p.visible !== false;
        p.agotado = o.agotado !== undefined ? !!o.agotado : !!p.agotado;
        if (o.nombre !== undefined) p.nombre = o.nombre;
        if (o.descripcion !== undefined) p.descripcion = o.descripcion;
        if (o.descripcionLarga !== undefined) p.descripcionLarga = o.descripcionLarga;
        if (o.precio !== undefined) p.precio = Number(o.precio);
        if (o.categoria !== undefined) p.categoria = o.categoria;
      } else {
        p.visible = p.visible !== false;
        p.agotado = !!p.agotado;
      }
    });
    Object.entries(over).forEach(([id, o]) => {
      if (o._nuevo && !productos.find(p => p.id === id)) {
        productos.push({
          id,
          nombre: o.nombre || 'Nuevo producto',
          descripcion: o.descripcion || '',
          descripcionLarga: o.descripcionLarga || '',
          precio: Number(o.precio) || 0,
          categoria: o.categoria || 'cargadores',
          img: o.img || 'img/placeholder.svg',
          imagenes: [o.img || 'img/placeholder.svg'],
          visible: o.visible !== false,
          agotado: !!o.agotado,
        });
      }
    });
  } catch (_) {}
  if (typeof actualizarUI === 'function') actualizarUI();
}

;(async () => {
  if (USAR_SUPABASE) {
    try {
      const data = await sbProductos();
      if (data && data.length) {
        productos.length = 0;
        productos.push(...data);
        if (typeof actualizarUI === 'function') actualizarUI();
        return;
      }
    } catch (_) {}
    return;
  }
  try {
    const res = await fetch('/api/productos');
    if (res.ok) {
      const data = await res.json();
      productos.length = 0;
      productos.push(...data);
    }
  } catch (_) {}
  aplicarOverridesTienda();
})();
