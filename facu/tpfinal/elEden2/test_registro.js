// Test de registro directo a la API
const testData = {
    username: 'usuarioprueba' + Date.now(),
    email: 'usuario' + Date.now() + '@prueba.com',
    password: 'contraseña123',
    password2: 'contraseña123',
    first_name: 'Usuario',
    last_name: 'Prueba',
    telefono: '+54 9 11 1234-5678',
    direccion: 'Calle Falsa 123, Buenos Aires'
};

async function testRegistro() {
    try {
        console.log('Enviando datos de registro:', testData);
        
        const response = await fetch('http://localhost:8000/api/v1/auth/register/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        });
        
        const result = await response.json();
        
        console.log('Status:', response.status);
        console.log('Response:', result);
        
        if (response.ok) {
            console.log('✅ ¡Registro exitoso!');
            
            // Probar el token si está disponible
            if (result.access) {
                console.log('🔑 Token de acceso recibido, probando...');
                
                const userResponse = await fetch('http://localhost:8000/api/v1/auth/user/', {
                    headers: {
                        'Authorization': `Bearer ${result.access}`,
                    }
                });
                
                const userData = await userResponse.json();
                console.log('👤 Datos del usuario:', userData);
            }
        } else {
            console.log('❌ Error en el registro');
        }
    } catch (error) {
        console.error('🚨 Error de red:', error);
    }
}

// Ejecutar el test
testRegistro();
