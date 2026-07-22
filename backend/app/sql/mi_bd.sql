-- =============================================================
-- 1. FUNCIÓN DE ACTUALIZACIÓN AUTOMÁTICA
-- =============================================================
CREATE OR REPLACE FUNCTION actualizar_fecha_modificacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================
-- 2. CREACIÓN DE ESTRUCTURA (TU DDL ORIGINAL EXACTO)
-- =============================================================

CREATE TABLE roles (
    id_rol SERIAL PRIMARY KEY,
    nombre_rol VARCHAR(50) NOT NULL UNIQUE,
    estado VARCHAR(20) DEFAULT 'Activo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER trigger_update_roles BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_modificacion();

CREATE TABLE modulos (
    id_modulo SERIAL PRIMARY KEY,
    nombre_modulo VARCHAR(100) NOT NULL UNIQUE,
    estado VARCHAR(20) DEFAULT 'Activo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER trigger_update_modulos BEFORE UPDATE ON modulos FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_modificacion();

CREATE TABLE usuarios (
    id_usuario SERIAL PRIMARY KEY,
    identificacion VARCHAR(20) NOT NULL UNIQUE, 
    nombre_completo VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    genero VARCHAR(15),
    pais VARCHAR(50),
    departamento VARCHAR(50),
    ciudad VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL,
    id_rol INT NOT NULL REFERENCES roles(id_rol),
    estado VARCHAR(20) DEFAULT 'Activo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER trigger_update_usuarios BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_modificacion();

CREATE TABLE telefono (
    id_telefono SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    numero VARCHAR(20) NOT NULL,
    tipo VARCHAR(20) DEFAULT 'Movil',
    estado VARCHAR(20) DEFAULT 'Activo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER trigger_update_telefono BEFORE UPDATE ON telefono FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_modificacion();

CREATE TABLE perfiles_clinicos (
    id_perfil SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL UNIQUE REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    edad INT,
    peso_kg DECIMAL(5,2),
    altura_cm DECIMAL(5,2),
    biotipo VARCHAR(20) DEFAULT 'No Definido',
    confianza_ia DECIMAL(5,4),
    meta_calorica_diaria INT,
    proteinas_g DECIMAL(5,2) DEFAULT 0,
    carbohidratos_g DECIMAL(5,2) DEFAULT 0,
    grasas_g DECIMAL(5,2) DEFAULT 0,
    recomendaciones TEXT,
    estado VARCHAR(20) DEFAULT 'Activo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER trigger_update_perfiles BEFORE UPDATE ON perfiles_clinicos FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_modificacion();

CREATE TABLE alimentos (
    id_alimento SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    categoria VARCHAR(50), 
    calorias INT NOT NULL,
    proteinas_g DECIMAL(5,2) DEFAULT 0,
    carbohidratos_g DECIMAL(5,2) DEFAULT 0,
    grasas_g DECIMAL(5,2) DEFAULT 0,
    fibra_g DECIMAL(5,2) DEFAULT 0,
    azucares_g DECIMAL(5,2) DEFAULT 0,
    sodio_mg DECIMAL(6,2) DEFAULT 0,
    vitaminas TEXT,
    minerales TEXT,
    es_apto_diabetico BOOLEAN DEFAULT FALSE,
    estado VARCHAR(20) DEFAULT 'Activo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER trigger_update_alimentos BEFORE UPDATE ON alimentos FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_modificacion();

CREATE TABLE permisos_roles (
    id_permiso SERIAL PRIMARY KEY,
    id_rol INT NOT NULL REFERENCES roles(id_rol),
    id_modulo INT NOT NULL REFERENCES modulos(id_modulo),
    puede_leer BOOLEAN DEFAULT TRUE,
    puede_escribir BOOLEAN DEFAULT FALSE,
    puede_editar BOOLEAN DEFAULT FALSE,
    estado VARCHAR(20) DEFAULT 'Activo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER trigger_update_permisos BEFORE UPDATE ON permisos_roles FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_modificacion();

CREATE TABLE registro_consumo (
    id_registro SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES usuarios(id_usuario),
    id_alimento INT NOT NULL REFERENCES alimentos(id_alimento),
    cantidad_gramos DECIMAL(6,2) NOT NULL,
    tipo_comida VARCHAR(30) DEFAULT 'Almuerzo',
    fecha_consumo DATE DEFAULT CURRENT_DATE,
    estado VARCHAR(20) DEFAULT 'Activo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER trigger_update_consumo BEFORE UPDATE ON registro_consumo FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_modificacion();

CREATE TABLE historial (
    id_historial SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES usuarios(id_usuario),
    fecha_inicio DATE DEFAULT CURRENT_DATE,
    estado VARCHAR(20) DEFAULT 'Activo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER trigger_update_historial BEFORE UPDATE ON historial FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_modificacion();

CREATE TABLE historial_chat (
    id_chat SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES usuarios(id_usuario),
    id_historial INT REFERENCES historial(id_historial),
    pregunta_usuario TEXT NOT NULL,
    respuesta_ia TEXT NOT NULL,
    flag_revision_nutricionista BOOLEAN DEFAULT FALSE,
    estado VARCHAR(20) DEFAULT 'Activo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER trigger_update_chat_ia BEFORE UPDATE ON historial_chat FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_modificacion();

-- =============================================================
-- 3. INSERCIÓN MASIVA DE DATOS BASE Y CATÁLOGOS
-- =============================================================

INSERT INTO roles (nombre_rol) VALUES 
('Administrador'), ('Nutricionista'), ('Paciente');

INSERT INTO modulos (nombre_modulo) VALUES 
('Dashboard'), ('Usuarios'), ('Alimentos'), ('Reportes'), ('Configuracion'),
('Pagos'), ('Citas'), ('Chat IA'), ('Historial Clinico'), ('Notificaciones');

-- 20 Usuarios (Para que el gráfico de ciudades brille)
INSERT INTO usuarios (identificacion, nombre_completo, email, genero, pais, departamento, ciudad, password_hash, id_rol) VALUES
('1001', 'Juan Perez', 'juan.admin@app.com', 'Masculino', 'Colombia', 'Bogota', 'Bogota', 'hash_admin_1', 1),
('1002', 'Dra. Maria Lopez', 'maria.nutri@app.com', 'Femenino', 'Colombia', 'Antioquia', 'Medellin', 'hash_nutri_2', 2),
('1003', 'Carlos Cliente', 'carlos.paciente@gmail.com', 'Masculino', 'Mexico', 'CDMX', 'CDMX', 'hash_pac_3', 3),
('1004', 'Ana Garcia', 'ana.paciente@gmail.com', 'Femenino', 'Argentina', 'BA', 'Buenos Aires', 'hash_pac_4', 3),
('1005', 'Pedro Gomez', 'pedro.paciente@app.com', 'Masculino', 'Chile', 'Santiago', 'Santiago', 'hash_pac_5', 3),
('1006', 'Laura Martinez', 'laura.paciente@app.com', 'Femenino', 'Peru', 'Lima', 'Lima', 'hash_pac_6', 3),
('1007', 'Sofia Rojas', 'sofia.paciente@yahoo.com', 'Femenino', 'Colombia', 'Valle', 'Cali', 'hash_pac_7', 3),
('1008', 'Miguel Torres', 'miguel.paciente@hotmail.com', 'Masculino', 'Colombia', 'Valle', 'Cali', 'hash_pac_8', 3),
('1009', 'Lucia Mendez', 'lucia.paciente@outlook.com', 'Femenino', 'Colombia', 'Atlantico', 'Barranquilla', 'hash_pac_9', 3),
('1010', 'David Ramirez', 'david.paciente@app.com', 'Masculino', 'Colombia', 'Bogota', 'Bogota', 'hash_pac_10', 3),
('1011', 'Valentina Castro', 'valentina.c@gmail.com', 'Femenino', 'Colombia', 'Antioquia', 'Medellin', 'hash_pac_11', 3),
('1012', 'Andres Felipe Ruiz', 'andres.ruiz@hotmail.com', 'Masculino', 'Colombia', 'Atlantico', 'Barranquilla', 'hash_pac_12', 3),
('1013', 'Camila Ortiz', 'camila.ortiz@app.com', 'Femenino', 'Colombia', 'Bogota', 'Bogota', 'hash_pac_13', 3),
('1014', 'Dr. Roberto Fernandez', 'roberto.nutri@app.com', 'Masculino', 'Colombia', 'Valle', 'Cali', 'hash_nutri_14', 2),
('1015', 'Diego Sanchez', 'diego.s@yahoo.com', 'Masculino', 'Colombia', 'Santander', 'Bucaramanga', 'hash_pac_15', 3),
('1016', 'Maria Jose Londoño', 'mj.londono@gmail.com', 'Femenino', 'Colombia', 'Eje Cafetero', 'Pereira', 'hash_pac_16', 3),
('1017', 'Javier Morales', 'javi.morales@app.com', 'Masculino', 'Mexico', 'Jalisco', 'Guadalajara', 'hash_pac_17', 3),
('1018', 'Isabella Vargas', 'isa.vargas@outlook.com', 'Femenino', 'Chile', 'Valparaiso', 'Vina del Mar', 'hash_pac_18', 3),
('1019', 'Mateo Herrera', 'mateo.h@gmail.com', 'Masculino', 'Colombia', 'Atlantico', 'Barranquilla', 'hash_pac_19', 3),
('1020', 'Juliana Rios', 'juli.rios@app.com', 'Femenino', 'Colombia', 'Bogota', 'Bogota', 'hash_pac_20', 3);

-- 20 Teléfonos
INSERT INTO telefono (id_usuario, numero, tipo) VALUES
(1, '3001110001', 'Movil'), (2, '3001110002', 'Consultorio'), (3, '3001110003', 'Movil'),
(4, '3001110004', 'Movil'), (5, '3001110005', 'Movil'), (6, '3001110006', 'Movil'),
(7, '3001110007', 'Movil'), (8, '3001110008', 'Movil'), (9, '3001110009', 'Movil'), (10, '3001110010', 'Movil'),
(11, '3001110011', 'Movil'), (12, '3001110012', 'Movil'), (13, '3001110013', 'Movil'),
(14, '3001110014', 'Consultorio'), (15, '3001110015', 'Movil'), (16, '3001110016', 'Movil'),
(17, '3001110017', 'Movil'), (18, '3001110018', 'Movil'), (19, '3001110019', 'Movil'), (20, '3001110020', 'Movil');

-- 20 Perfiles Clínicos (Con Confianza IA)
INSERT INTO perfiles_clinicos (id_usuario, edad, peso_kg, altura_cm, biotipo, confianza_ia, meta_calorica_diaria) VALUES
(1, 35, 80.0, 175.0, 'Mesomorfo', 0.95, 2500), (2, 29, 60.0, 165.0, 'Ectomorfo', 0.92, 2000),
(3, 40, 95.5, 180.0, 'Endomorfo', 0.88, 1800), (4, 25, 55.0, 160.0, 'Ectomorfo', 0.96, 2200),
(5, 30, 85.0, 178.0, 'Mesomorfo', 0.85, 3000), (6, 28, 62.0, 168.0, 'No Definido', 0.89, 2000),
(7, 33, 70.0, 170.0, 'Endomorfo', 0.94, 1900), (8, 45, 88.0, 172.0, 'Mesomorfo', 0.91, 2400),
(9, 22, 50.0, 158.0, 'Ectomorfo', 0.87, 2100), (10, 27, 75.0, 176.0, 'Mesomorfo', 0.93, 2300),
(11, 24, 58.0, 162.0, 'Ectomorfo', 0.89, 2100), (12, 31, 82.5, 175.0, 'Endomorfo', 0.82, 1900),
(13, 29, 65.0, 168.0, 'Mesomorfo', 0.93, 2200), (14, 42, 90.0, 170.0, 'Endomorfo', 0.86, 1800),
(15, 26, 54.0, 158.0, 'Ectomorfo', 0.95, 2300), (16, 35, 78.0, 177.0, 'Mesomorfo', 0.97, 2500),
(17, 28, 61.0, 165.0, 'No Definido', 0.84, 2000), (18, 23, 72.0, 174.0, 'Mesomorfo', 0.99, 2600),
(19, 38, 85.0, 160.0, 'Endomorfo', 0.81, 1700), (20, 25, 68.0, 168.0, 'Mesomorfo', 0.90, 2100);

-- Tus 30 alimentos exactos
INSERT INTO alimentos (nombre, categoria, calorias, proteinas_g, carbohidratos_g, grasas_g, es_apto_diabetico) VALUES
('Pechuga de Pollo', 'Proteina', 165, 31.0, 0.0, 3.6, TRUE), ('Arroz Blanco', 'Carbohidrato', 130, 2.7, 28.0, 0.3, TRUE),
('Huevo Cocido', 'Proteina', 155, 13.0, 1.1, 11.0, TRUE), ('Manzana', 'Fruta', 52, 0.3, 14.0, 0.2, TRUE),
('Avena', 'Cereal', 389, 16.9, 66.0, 6.9, TRUE), ('Salmon', 'Pescado', 208, 20.0, 0.0, 13.0, TRUE),
('Aguacate', 'Grasa', 160, 2.0, 9.0, 15.0, TRUE), ('Leche Entera', 'Lacteo', 42, 3.4, 5.0, 1.0, TRUE),
('Pan Integral', 'Cereal', 265, 9.0, 49.0, 3.0, TRUE), ('Almendras', 'Fruto Seco', 579, 21.0, 22.0, 50.0, TRUE),
('Brocoli', 'Vegetal', 34, 2.8, 7.0, 0.4, TRUE), ('Espinaca', 'Vegetal', 23, 2.9, 3.6, 0.4, TRUE),
('Platano', 'Fruta', 89, 1.1, 23.0, 0.3, TRUE), ('Lentejas', 'Legumbre', 116, 9.0, 20.0, 0.4, TRUE),
('Garbanzos', 'Legumbre', 164, 8.9, 27.0, 2.6, TRUE), ('Atun en Agua', 'Pescado', 116, 26.0, 0.0, 1.0, TRUE),
('Yogur Griego', 'Lacteo', 59, 10.0, 3.6, 0.4, TRUE), ('Quinoa', 'Pseudocereal', 120, 4.4, 21.3, 1.9, TRUE),
('Pavo (Pechuga)', 'Proteina', 135, 30.0, 0.0, 1.0, TRUE), ('Nueces', 'Fruto Seco', 654, 15.0, 14.0, 65.0, TRUE),
('Papaya', 'Fruta', 43, 0.5, 11.0, 0.3, TRUE), ('Zanahoria', 'Vegetal', 41, 0.9, 10.0, 0.2, TRUE),
('Carne de Res Magra', 'Proteina', 250, 26.0, 0.0, 15.0, TRUE), ('Queso Campesino', 'Lacteo', 200, 15.0, 3.0, 14.0, TRUE),
('Pasta Integral', 'Carbohidrato', 124, 5.3, 26.5, 0.5, TRUE), ('Tofu', 'Proteina Vegetal', 76, 8.0, 1.9, 4.8, TRUE),
('Chia (Semillas)', 'Semilla', 486, 16.5, 42.1, 30.7, TRUE), ('Coco (Agua)', 'Bebida', 19, 0.7, 3.7, 0.2, TRUE),
('Te Verde', 'Bebida', 1, 0.2, 0.0, 0.0, TRUE), ('Aceite de Oliva', 'Grasa', 884, 0.0, 0.0, 100.0, TRUE);

INSERT INTO alimentos (nombre, categoria, calorias, proteinas_g, carbohidratos_g, grasas_g, fibra_g, sodio_mg, es_apto_diabetico, vitaminas, minerales) VALUES
-- 1. Arepa de Huevo: masa de maíz frita rellena con huevo, icónica de la Costa Caribe
('Arepa de Huevo', 'Comida Tipica Barranquilla', 280, 9.5, 32.0, 12.5, 1.8, 320.0, FALSE,
 'B1, B2, B12, D', 'Hierro, Calcio, Fosforo'),

-- 2. Empanada Barranquillera: masa de maíz frita rellena de carne guisada y papa
('Empanada Barranquillera', 'Comida Tipica Barranquilla', 260, 8.0, 30.0, 11.0, 1.5, 280.0, FALSE,
 'B1, B3, B6', 'Hierro, Zinc, Potasio'),

-- 3. Sancocho de Gallina: sopa tradicional con gallina criolla, yuca, papa y plátano
('Sancocho de Gallina', 'Comida Tipica Barranquilla', 85, 7.5, 8.0, 2.5, 1.2, 450.0, TRUE,
 'B3, B6, C', 'Potasio, Fosforo, Magnesio'),

-- 4. Patacón con Hogao: plátano verde aplastado y frito, servido con hogao (salsa de tomate y cebolla)
('Patacon con Hogao', 'Comida Tipica Barranquilla', 230, 3.0, 42.0, 6.0, 2.8, 180.0, FALSE,
 'B6, C, E', 'Potasio, Magnesio, Vitamina C'),

-- 5. Butifarra de Soledad: embutido artesanal típico del municipio de Soledad, Atlántico
('Butifarra de Soledad', 'Comida Tipica Barranquilla', 310, 14.0, 5.0, 26.0, 0.0, 780.0, FALSE,
 'B1, B12, B3', 'Hierro, Zinc, Sodio'),

-- 6. Mote de Queso: sopa espesa de ñame con queso costeño, típica del Caribe colombiano
('Mote de Queso', 'Comida Tipica Barranquilla', 140, 6.5, 18.0, 4.5, 1.5, 390.0, TRUE,
 'B2, D, A', 'Calcio, Fosforo, Sodio'),

-- 7. Arroz de Lisa: arroz preparado con pescado lisa del río Magdalena, típico barranquillero
('Arroz de Lisa', 'Comida Tipica Barranquilla', 175, 12.0, 22.0, 4.0, 0.5, 310.0, TRUE,
 'B12, D, Omega3', 'Fosforo, Potasio, Selenio'),

-- 8. Carimañola: croqueta de yuca rellena de carne guisada o queso, fritura tradicional
('Carimanola', 'Comida Tipica Barranquilla', 240, 7.5, 35.0, 8.5, 1.8, 260.0, FALSE,
 'B6, C, E', 'Potasio, Magnesio, Hierro'),

-- 9. Bollo de Yuca: masa de yuca cocida envuelta en hoja de plátano, acompañante tradicional
('Bollo de Yuca', 'Comida Tipica Barranquilla', 150, 2.5, 33.0, 1.5, 1.2, 120.0, TRUE,
 'B6, C', 'Potasio, Calcio, Magnesio'),

-- 10. Dulce de Papayuela: postre tradicional de papayuela en almíbar con canela y clavos
('Dulce de Papayuela', 'Comida Tipica Barranquilla', 195, 0.5, 48.0, 0.2, 1.0, 15.0, FALSE,
 'A, C, B6', 'Potasio, Calcio');

INSERT INTO permisos_roles (id_rol, id_modulo, puede_leer, puede_escribir, puede_editar) VALUES
(1, 1, TRUE, TRUE, TRUE), (1, 2, TRUE, TRUE, TRUE), (1, 3, TRUE, TRUE, TRUE),
(2, 3, TRUE, TRUE, TRUE), (2, 9, TRUE, TRUE, TRUE), (2, 8, TRUE, TRUE, FALSE),
(3, 1, TRUE, FALSE, FALSE), (3, 8, TRUE, TRUE, FALSE), (3, 4, TRUE, FALSE, FALSE), (3, 9, TRUE, FALSE, FALSE);

-- =============================================================
-- 4. INSERCIÓN DE CONSUMOS HISTÓRICOS (2024-2026) CON TODOS LOS USUARIOS
-- =============================================================

INSERT INTO registro_consumo (id_usuario, id_alimento, cantidad_gramos, fecha_consumo) VALUES
-- AÑO 2024
(3, 1, 150.0, '2024-02-15'), (4, 2, 100.0, '2024-03-10'), (5, 3, 50.0, '2024-04-22'),
(6, 4, 120.0, '2024-05-05'), (7, 5, 80.0, '2024-06-14'), (8, 6, 200.0, '2024-07-28'),
(9, 7, 50.0, '2024-08-15'), (10, 8, 250.0, '2024-09-10'), (11, 9, 60.0, '2024-10-20'),
(12, 10, 200.0, '2024-11-15'), (13, 11, 150.0, '2024-12-05'), (15, 12, 180.0, '2024-12-24'),

-- AÑO 2025
(16, 13, 100.0, '2025-01-20'), (17, 14, 120.0, '2025-02-10'), (18, 15, 80.0, '2025-03-25'),
(19, 16, 180.0, '2025-04-15'), (20, 17, 60.0, '2025-05-10'), (3, 18, 200.0, '2025-06-05'),
(5, 19, 80.0, '2025-07-01'), (7, 20, 40.0, '2025-08-15'), (9, 21, 180.0, '2025-09-24'),
(11, 22, 150.0, '2025-10-05'), (13, 23, 120.0, '2025-11-10'), (15, 24, 100.0, '2025-12-15'),

-- AÑO 2026 (Hasta la fecha actual)
(17, 25, 90.0, '2026-01-05'), (19, 26, 200.0, '2026-01-15'), (3, 27, 50.0, '2026-01-25'),
(5, 28, 250.0, '2026-02-05'), (7, 29, 80.0, '2026-02-10'), (9, 30, 30.0, '2026-02-15'),
(11, 1, 150.0, '2026-02-20'), (13, 2, 120.0, '2026-02-25'), (15, 3, 100.0, '2026-02-28'),
(17, 4, 150.0, '2026-03-01'), (19, 5, 80.0, '2026-03-02'), (20, 6, 200.0, '2026-03-03'),
(4, 7, 60.0, '2026-03-04'), (6, 8, 250.0, '2026-03-05'), (8, 9, 100.0, '2026-03-06'),
(10, 10, 40.0, '2026-03-07'), (12, 11, 180.0, '2026-03-08'), (18, 12, 150.0, '2026-03-09');

-- CONSUMOS DE COMIDAS TIPICAS BARRANQUILLA (IDs 31-40)
-- Usuarios de Barranquilla: Lucia(9), Andres(12), Mateo(19)
-- Arepa de Huevo (31), Empanada Barranquillera (32), Sancocho de Gallina (33)
-- Patacon con Hogao (34), Butifarra de Soledad (35), Mote de Queso (36)
-- Arroz de Lisa (37), Carimanola (38), Bollo de Yuca (39), Dulce de Papayuela (40)
(9, 31, 150.0, '2026-04-01'),  -- Lucia come Arepa de Huevo
(12, 32, 120.0, '2026-04-02'), -- Andres come Empanada
(19, 33, 300.0, '2026-04-03'), -- Mateo come Sancocho
(9, 34, 180.0, '2026-04-05'),  -- Lucia come Patacon
(12, 35, 100.0, '2026-04-06'), -- Andres come Butifarra
(19, 36, 250.0, '2026-04-08'), -- Mateo come Mote de Queso
(9, 37, 200.0, '2026-04-10'),  -- Lucia come Arroz de Lisa
(12, 38, 130.0, '2026-04-12'), -- Andres come Carimanola
(19, 39, 160.0, '2026-04-14'), -- Mateo come Bollo de Yuca
(9, 40, 80.0, '2026-04-16'),   -- Lucia come Dulce de Papayuela
(12, 31, 150.0, '2026-05-01'), -- Andres come Arepa de Huevo
(19, 32, 120.0, '2026-05-02'), -- Mateo come Empanada
(9, 35, 100.0, '2026-05-10'),  -- Lucia come Butifarra
(12, 37, 200.0, '2026-05-15'), -- Andres come Arroz de Lisa
(19, 40, 90.0, '2026-05-20'),  -- Mateo come Dulce de Papayuela
(9, 38, 130.0, '2026-06-01'),  -- Lucia come Carimanola
(12, 39, 160.0, '2026-06-05'), -- Andres come Bollo de Yuca
(19, 34, 180.0, '2026-06-10'), -- Mateo come Patacon
(9, 33, 300.0, '2026-06-15'),  -- Lucia come Sancocho
(12, 36, 250.0, '2026-06-20'); -- Andres come Mote de Queso

-- =============================================================
-- 5. HISTORIAL DE CHAT IA
-- =============================================================

INSERT INTO historial (id_usuario) VALUES
(3), (4), (5), (6), (7), (8), (9), (10), (15), (19);

INSERT INTO historial_chat (id_usuario, id_historial, pregunta_usuario, respuesta_ia) VALUES
(3, 1, '¿Cuántas calorías tiene el pollo?', 'El pollo tiene aprox 165 cal por 100g.'),
(3, 1, 'Quiero bajar de peso', 'Debes mantener un déficit calórico.'),
(4, 2, '¿Puedo comer pan si soy celiaca?', 'No, el pan común tiene gluten.'),
(5, 3, 'Rutina para bajar de peso', 'Enfócate en déficit calórico y ejercicio de fuerza.'),
(10, 8, '¿Qué es la creatina?', 'Es un suplemento para mejorar el rendimiento físico.'),
-- CHAT DE USUARIOS BARRANQUILLEROS SOBRE COMIDAS LOCALES (historial 7=id9, 10=id19)
(9, 7, '¿Cuántas calorías tiene una arepa de huevo?', 'Una arepa de huevo tiene aprox 280 kcal por 100g. Es un alimento típico de la Costa Caribe, energético por su combinación de masa de maíz frita y huevo. Contiene proteínas (9.5g), carbohidratos (32g) y grasas (12.5g).'),
(9, 7, '¿El sancocho de gallina engorda?', 'El sancocho de gallina es relativamente bajo en calorías: ~85 kcal/100g. Es rico en proteínas y minerales como potasio. Es una excelente opción nutritiva y muy completa por sus tubérculos y vegetales.'),
(19, 10, '¿Es saludable comer patacón?', 'El patacón con hogao aporta ~230 kcal/100g. El plátano verde es una buena fuente de potasio y fibra (2.8g). En moderación es parte de una dieta balanceada. El hogao (tomate y cebolla) agrega vitamina C sin muchas calorías extra.'),
(12, 5, '¿Cuántas calorías tiene la butifarra de Soledad?', 'La butifarra de Soledad tiene ~310 kcal/100g. Es alta en proteínas (14g) y grasas (26g), y con bastante sodio (780mg). Se recomienda consumirla con moderación, especialmente para personas con hipertensión.'),
(19, 10, '¿La carimañola es apta para diabéticos?', 'La carimañola NO es apta para diabéticos ya que tiene ~240 kcal/100g con 35g de carbohidratos de yuca frita, lo cual eleva la glucosa rápidamente. Se recomienda buscar versiones horneadas o consumirla en pequeñas porciones.'),
(9, 7, '¿El mote de queso es nutritivo?', 'El mote de queso es moderado en calorías (~140 kcal/100g) y una buena fuente de calcio y fósforo por el queso costeño. El ñame aporta carbohidratos de absorción media. Es una opción apta para diabéticos con control de porciones.');