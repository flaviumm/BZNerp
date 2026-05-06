insert into companies (name, type, city, status, contact, phone, next_action, value) values
('Neuquen Energy Services', 'Oil & Gas', 'Anelo', 'Prospecto', 'Mariana Rios', '+54 299 443-1020', 'Llamar compras', 18500000),
('Constructora Patagonia Norte', 'Constructora', 'Neuquen', 'Activo', 'Pablo Castro', '+54 299 521-8870', 'Enviar presupuesto', 7200000),
('Estudio Arq. Sur', 'Arquitectura', 'Plottier', 'Contactado', 'Lucia Herrera', '+54 299 600-1450', 'Reunion tecnica', 3900000),
('Servicios Industriales VM', 'Industria', 'Centenario', 'Negociacion', 'Victor Molina', '+54 299 477-3099', 'Definir alcance', 12600000),
('Municipalidad de San Patricio', 'Sector publico', 'San Patricio del Chanar', 'Activo', 'Carolina Funes', '+54 299 489-7721', 'Presentar avance', 5100000);

insert into opportunities (company, service, stage, amount, probability, owner, due) values
('Neuquen Energy Services', 'Piletas industriales', 'Nuevo prospecto', 18500000, 25, 'Ventas', '2026-05-09'),
('Constructora Patagonia Norte', 'Estructuras metalicas', 'Presupuesto enviado', 7200000, 65, 'Direccion', '2026-05-07'),
('Estudio Arq. Sur', 'Barandas y escaleras', 'Reunion', 3900000, 40, 'Ventas', '2026-05-10'),
('Servicios Industriales VM', 'Tableros electricos', 'Negociacion', 12600000, 75, 'Ingenieria', '2026-05-06'),
('Municipalidad de San Patricio', 'Mantenimiento urbano', 'Ganado', 5100000, 100, 'Operaciones', '2026-05-13');

insert into quotes (number, client, service, subtotal, tax, total, status, valid_until) values
('P-0001', 'Constructora Patagonia Norte', 'Estructuras metalicas', 5950413, 1249587, 7200000, 'Enviado', '2026-05-20'),
('P-0002', 'Servicios Industriales VM', 'Tableros electricos', 10413223, 2186777, 12600000, 'En revision', '2026-05-18'),
('P-0003', 'Estudio Arq. Sur', 'Barandas', 3223140, 676860, 3900000, 'Borrador', '2026-05-25');

insert into work_orders (number, client, service, status, progress, margin, start_date, end_date, team) values
('OT-0001', 'Constructora Patagonia Norte', 'Estructuras metalicas', 'En ejecucion', 55, 31, '2026-04-28', '2026-05-17', 'Taller A'),
('OT-0002', 'Servicios Industriales VM', 'Tableros electricos', 'Programada', 15, 38, '2026-05-08', '2026-05-21', 'Electricidad'),
('OT-0003', 'Neuquen Energy Services', 'Piletas industriales', 'Pendiente', 0, 35, '2026-05-15', '2026-06-02', 'Taller B'),
('OT-0004', 'Municipalidad de San Patricio', 'Mantenimiento urbano', 'En ejecucion', 72, 27, '2026-04-25', '2026-05-12', 'Campo');

insert into inventory_items (sku, name, category, stock, min_stock, unit, cost) values
('MAT-001', 'Chapa galvanizada 2mm', 'Metales', 18, 12, 'planchas', 86500),
('MAT-002', 'Perfil UPN 100', 'Metales', 34, 20, 'barras', 112000),
('ELE-014', 'Disyuntor trifasico 40A', 'Electricidad', 6, 10, 'unidades', 74200),
('SEG-009', 'EPP soldador completo', 'Seguridad', 9, 8, 'kits', 156000),
('PNT-003', 'Pintura epoxi industrial', 'Pintura', 4, 6, 'latas', 91300);

insert into purchase_orders (number, supplier, area, total, status, due) values
('OC-0041', 'Aceros del Valle', 'Taller', 1865000, 'Recibida', '2026-05-04'),
('OC-0042', 'Electro Patagonia', 'Electricidad', 942000, 'Pendiente', '2026-05-08'),
('OC-0043', 'Pintureria Industrial Sur', 'Terminacion', 318000, 'Autorizacion', '2026-05-06');

insert into invoices (number, client, concept, total, status, due) values
('F-00084', 'Constructora Patagonia Norte', 'Anticipo OT-0001', 2880000, 'Cobrada', '2026-04-30'),
('F-00085', 'Municipalidad de San Patricio', 'Certificado avance', 1530000, 'Pendiente', '2026-05-12'),
('F-00086', 'Servicios Industriales VM', 'Anticipo tablero', 3780000, 'Por vencer', '2026-05-09');

insert into employees (name, role, team, status, hours) values
('Sofia Becerra', 'Administracion', 'Backoffice', 'Disponible', 148),
('Diego Saez', 'Soldador', 'Taller A', 'Asignado', 162),
('Martin Quiroga', 'Tecnico electrico', 'Electricidad', 'Asignado', 154),
('Nadia Perez', 'Jefa de obra', 'Campo', 'Asignado', 170),
('Tomas Aguilar', 'Compras', 'Backoffice', 'Disponible', 144);

insert into tasks (text, owner, priority, due) values
('Cerrar alcance de piletas industriales', 'Ingenieria', 'Alta', '2026-05-06'),
('Confirmar entrega de disyuntores', 'Compras', 'Media', '2026-05-08'),
('Enviar certificado de avance municipal', 'Administracion', 'Alta', '2026-05-07'),
('Revisar margen de OT-0004', 'Direccion', 'Media', '2026-05-09');
