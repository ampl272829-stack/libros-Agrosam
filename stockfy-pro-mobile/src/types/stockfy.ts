export type WalletId =
  | 'pago_movil'
  | 'zelle'
  | 'binance'
  | 'efectivo_usd'
  | 'efectivo_bs'
  | 'punto_venta'
  | 'transferencia';

export interface WalletDefinition {
  id: WalletId;
  nombre: string;
  monedaBase: 'USD' | 'VES';
  descripcion: string;
}

export type RateSource = 'bcv' | 'paralelo' | 'manual';

export interface ExchangeRateState {
  source: RateSource;
  bcvRate: number;
  paraleloRate: number;
  manualRate: number;
  activeRate: number;
  lastUpdated: string;
  syncStatus: 'online' | 'offline' | 'manual';
}

export type ProductUnit = 'u' | 'kg' | 'L' | 'm';

export interface Product {
  id: string;
  nombre: string;
  sku?: string;
  unidad?: ProductUnit;
  stock: number;
  costoUSD: number;
  margenPct: number;
  precioUSD: number;
  categoria?: string;
  updatedAt: string;
}

export interface SaleItem {
  productId: string;
  nombre: string;
  unidad?: ProductUnit;
  cantidad: number;
  costoUnitarioUSD: number;
  precioUnitarioUSD: number;
  subtotalUSD: number;
}

export interface SalePaymentSplit {
  monederoId: WalletId;
  montoUSD: number;
}

export interface CreditPayment {
  id: string;
  fecha: string;
  montoUSD: number;
  monederoId: WalletId;
  tasaAplicada: number;
}

export interface Sale {
  id: string;
  numeroFactura: string;
  fecha: string;
  items: SaleItem[];
  descuentoUSD?: number;
  totalUSD: number;
  totalVES: number;
  tasaAplicada: number;
  tipo: 'contado' | 'credito';
  monederoId?: WalletId;
  pagos?: SalePaymentSplit[];
  cliente?: string;
  nota?: string;
  estadoCredito?: 'pendiente' | 'cobrado';
  montoPagadoUSD?: number;
  abonos?: CreditPayment[];
  fechaCobro?: string;
  monederoCobroId?: WalletId;
}

export type CapitalMovementType =
  | 'inyeccion'
  | 'ajuste_capital'
  | 'compra_mercancia'
  | 'pago_fijo'
  | 'gasto_extra'
  | 'pago_proveedor'
  | 'deposito_ahorro'
  | 'retiro_ahorro'
  | 'perdida_garantia'
  | 'venta_contado'
  | 'cobro_credito'
  | 'transferencia_interna';

export interface LedgerMovement {
  id: string;
  fecha: string;
  tipo: CapitalMovementType;
  concepto: string;
  montoUSD: number; // positive = inflow, negative = outflow
  tasaAplicada: number;
  monederoId?: WalletId;
  referencia?: string;
}

export type FixedExpenseFrequency =
  | 'semanal'
  | 'quincenal'
  | 'mensual'
  | 'personalizada'
  | 'sin_recordatorio';

export interface FixedExpenseTemplate {
  id: string;
  nombre: string;
  categoria: 'Nómina' | 'Alquiler' | 'Servicios' | 'Fijo';
  montoUSD: number;
  monederoPreferido: WalletId;
  notas?: string;
  frecuencia?: FixedExpenseFrequency;
  cadaDias?: number;
  proximoVencimiento?: string; // YYYY-MM-DD
  ultimoPago?: string;
  vecesPagado: number;
}

export interface ExtraExpense {
  id: string;
  numeroRecibo: string;
  fecha: string;
  concepto: string;
  categoria: string;
  beneficiario?: string;
  montoUSD: number;
  montoVES: number;
  tasaAplicada: number;
  monederoId: WalletId;
  notas?: string;
  origen: 'extra' | 'fijo';
}

export interface WarrantyRecord {
  id: string;
  fecha: string;
  productId: string;
  productoNombre: string;
  cantidad: number;
  costoUnitarioUSD: number;
  perdidaTotalUSD: number;
  resolucion: 'perdida_total' | 'reingreso_stock';
  descontadoDeStock: boolean;
  motivo: string;
}

export interface SavingsMovement {
  id: string;
  fecha: string;
  tipo: 'deposito' | 'retiro';
  montoUSD: number;
  tasaAplicada: number;
  monederoId: WalletId;
  nota: string;
}

export interface SupplierPayable {
  id: string;
  proveedor: string;
  concepto: string;
  fechaEmision: string;
  fechaVencimiento?: string;
  montoTotalUSD: number;
  montoPagadoUSD: number;
  estado: 'pendiente' | 'pagado';
  tasaRegistro: number;
  notas?: string;
}

export interface CashClosingRecord {
  id: string;
  fecha: string;
  cajero: string;
  esperadoSistemaUSD: number;
  contadoFisicoUSD: number;
  diferenciaUSD: number;
  tasaAplicada: number;
  desgloseConteo: Partial<Record<WalletId, number>>;
  observacion?: string;
}

export interface FeatureSettings {
  // Punto 2: Escáner con Cámara + Compartir Ticket / Cobranza
  enableScannerAndShare: boolean;
  // Punto 3: Modo Cajero con PIN y Arqueo de Caja
  enableCashierPinAndShiftClose: boolean;
  ownerPin: string;
  // Punto 5: Cuentas por Pagar (Proveedores) + Utilidad Neta y Top Productos
  enableSuppliersAndNetAnalytics: boolean;
  // Punto 6: Catálogo Rápido de Precios para Clientes
  enablePublicCatalogExport: boolean;
}

export interface StoreConfig {
  nombreComercio: string;
  rif?: string;
  telefono?: string;
}

export interface StockfyState {
  store: StoreConfig;
  features: FeatureSettings;
  rates: ExchangeRateState;
  products: Product[];
  sales: Sale[];
  ledger: LedgerMovement[];
  fixedTemplates: FixedExpenseTemplate[];
  extraExpenses: ExtraExpense[];
  warranties: WarrantyRecord[];
  savingsMovements: SavingsMovement[];
  suppliers: SupplierPayable[];
  cashClosings: CashClosingRecord[];
}

export type ActiveTab =
  | 'dashboard'
  | 'sales'
  | 'inventory'
  | 'finance'
  | 'expenses';

export type ThemeMode = 'light' | 'dark';
