// Khởi tạo biến toàn cục
let emergencyActive = false;
let emergencySound = null;

// Dữ liệu giả lập cho biểu đồ
const temperatureData = [24, 25, 26, 27, 26, 25, 24, 23, 22, 23, 24, 25];
const humidityData = [55, 57, 60, 65, 68, 70, 72, 70, 68, 65, 60, 58];
const timeLabels = ['7:00', '8:00', '9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

// Biến lưu trữ phòng hiện tại
let currentRoom = 'Phong1';

// Chuyển đổi giữa các trang
document.addEventListener('DOMContentLoaded', function() {
    const page1Link = document.getElementById('page1-link');
    const page2Link = document.getElementById('page2-link');
    const page1 = document.getElementById('page1');
    const page2 = document.getElementById('page2');
    
    // Hiển thị trang chủ mặc định
    page1.style.display = 'block';
    
    // Khởi tạo đồng hồ kỹ thuật số
    updateClock();
    setInterval(updateClock, 1000);

    // Khởi tạo âm thanh khẩn cấp
    emergencySound = document.getElementById('emergency-sound');

    // Thiết lập biểu đồ
    initChart();
    initCO2Chart();

    // Thiết lập chọn phòng
    setupRoomSelection();

    // Sự kiện chuyển trang
    page1Link.addEventListener('click', function(e) {
        e.preventDefault();
        page1.style.display = 'block';
        page2.style.display = 'none';
        page1Link.classList.add('active');
        page2Link.classList.remove('active');
    });

    page2Link.addEventListener('click', function(e) {
        e.preventDefault();
        page1.style.display = 'none';
        page2.style.display = 'block';
        page1Link.classList.remove('active');
        page2Link.classList.add('active');
    });

    // Thiết lập kết nối Firebase và lắng nghe dữ liệu
    setupFirebaseListeners();

    // Xử lý điều khiển thiết bị trang 1
    setupDeviceControls();

    // Xử lý nút khẩn cấp
    setupEmergencyButton();
});

// Thiết lập kết nối Firebase và lắng nghe dữ liệu
function setupFirebaseListeners() {
    // Lắng nghe dữ liệu từ Trang 1
    const page1Ref = window.firebaseRef(window.db, 'Trang1');
    window.onFirebaseValue(page1Ref, (snapshot) => {
        const data = snapshot.val();
        console.log("Dữ liệu nhận từ Firebase (Trang1):", data);
        
        if (data) {
            // Cập nhật nhiệt độ và độ ẩm
            const temp = parseFloat(data.Temperature) || 0;
            const humidity = parseFloat(data.Humidity) || 0;
            
            console.log(`Cập nhật nhiệt độ: ${temp}°C, độ ẩm: ${humidity}%`);
            
            document.getElementById('temperature').textContent = `${temp}°C`;
            document.getElementById('humidity').textContent = `${humidity}%`;
            
            // Cập nhật các thiết bị trong Control 1 (nếu có)
            if (data['Control1']) {
                const control1 = data['Control1'];
                const tvSwitch = document.getElementById('tv-switch');
                const doorSwitch = document.getElementById('door-switch');
                const fanSwitch = document.getElementById('fan-switch');
                
                tvSwitch.checked = control1.TV === 1;
                document.getElementById('tv-status').textContent = control1.TV === 1 ? 'ON' : 'OFF';
                document.getElementById('tv-status').className = control1.TV === 1 ? 'status-on' : 'status-off';
                document.getElementById('tv-icon').src = control1.TV === 1 ? 'image_iot/TV_on.gif' : 'image_iot/TV_off.png';

                doorSwitch.checked = control1.Door === 1;
                document.getElementById('door-status').textContent = control1.Door === 1 ? 'ON' : 'OFF';
                document.getElementById('door-status').className = control1.Door === 1 ? 'status-on' : 'status-off';
                document.getElementById('door-icon').src = control1.Door === 1 ? 'image_iot/open-door.png' : 'image_iot/close-door.png';

                fanSwitch.checked = control1.Fan === 1;
                document.getElementById('fan-status').textContent = control1.Fan === 1 ? 'ON' : 'OFF';
                document.getElementById('fan-status').className = control1.Fan === 1 ? 'status-on' : 'status-off';
                document.getElementById('fan-icon').src = control1.Fan === 1 ? 'image_iot/openFan.gif' : 'image_iot/pc-fan.png';
                
                // Bật/tắt thanh trượt cấp độ quạt
                document.getElementById('fan-level').disabled = !fanSwitch.checked;
            }
        } else {
            console.warn("Không có dữ liệu từ Firebase");
            document.getElementById('temperature').textContent = '0°C';
            document.getElementById('humidity').textContent = '0%';
        }
    });

    // Lắng nghe dữ liệu từ Trang 2 - Control 2
    const control2Ref = window.firebaseRef(window.db, 'Trang2/Control2');
    window.onFirebaseValue(control2Ref, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // Cập nhật trạng thái đèn
            const lightSwitch = document.getElementById('light-switch');
            lightSwitch.checked = data.Lamp === 1;
            document.getElementById('light-status').textContent = data.Lamp === 1 ? 'ON' : 'OFF';
            document.getElementById('light-status').className = data.Lamp === 1 ? 'status-on' : 'status-off';
            document.getElementById('light-icon').src = data.Lamp === 1 ? 'image_iot/lampon.gif' : 'image_iot/lamp1.png';

            // Cập nhật trạng thái máy lạnh
            const acSwitch = document.getElementById('ac-switch');
            acSwitch.checked = data.AirC === 1;
            document.getElementById('ac-status').textContent = data.AirC === 1 ? 'ON' : 'OFF';
            document.getElementById('ac-status').className = data.AirC === 1 ? 'status-on' : 'status-off';
            document.getElementById('ac-icon').src = data.AirC === 1 ? 'image_iot/AirCLV1.png' : 'image_iot/AirC.png';
            
            // Bật/tắt thanh trượt cấp độ máy lạnh
            document.getElementById('ac-level').disabled = !acSwitch.checked;

            // Cập nhật trạng thái loa
            const speakerSwitch = document.getElementById('speaker-switch');
            speakerSwitch.checked = data.Speaker === 1;
            document.getElementById('speaker-status').textContent = data.Speaker === 1 ? 'ON' : 'OFF';
            document.getElementById('speaker-status').className = data.Speaker === 1 ? 'status-on' : 'status-off';
            document.getElementById('speaker-icon').src = data.Speaker === 1 ? 'image_iot/music.gif' : 'image_iot/speakeroff.png';

            // Cập nhật trạng thái khẩn cấp
            emergencyActive = data.Emergency === 1;
            const emergencyBtn = document.getElementById('emergency-button');
            const emergencyStatus = document.getElementById('emergency-status');
            if (emergencyActive) {
                emergencyBtn.classList.add('active');
                emergencyStatus.textContent = 'Đang hoạt động';
                emergencyStatus.className = 'status-on';
                playEmergencySound();
            } else {
                emergencyBtn.classList.remove('active');
                emergencyStatus.textContent = 'Tắt';
                emergencyStatus.className = 'status-off';
                stopEmergencySound();
            }
        }
    });

    // Lắng nghe dữ liệu từ các phòng
    const rooms = ['Phong1', 'Phong2', 'Phong3'];
    rooms.forEach(room => {
        const roomRef = window.firebaseRef(window.db, `Trang2/${room}`);
        window.onFirebaseValue(roomRef, (snapshot) => {
            const roomData = snapshot.val();
            if (roomData && room === currentRoom) { // Chỉ cập nhật nếu là phòng đang chọn
                const temp = parseFloat(roomData.Temperature) || 0;
                const humidity = parseFloat(roomData.Humidity) || 0;
                const co2 = parseFloat(roomData.Co2) || 0;

                document.getElementById('bedroom-temp').textContent = `${temp}°C`;
                document.getElementById('bedroom-humidity').textContent = `${humidity}%`;
                document.getElementById('bedroom-co2').textContent = `${co2}ppm`;

                // Cập nhật icon cho phòng hiện tại
                updateStatusIcons(temp, humidity, co2);
                
                // Cập nhật biểu đồ
                updateChartData(temp, humidity);
            }
        });
    });
}

// Cập nhật đồng hồ kỹ thuật số
function updateClock() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    
    document.getElementById('digital-clock').textContent = `${hours}:${minutes}:${seconds}`;
}

// Thiết lập điều khiển các thiết bị
function setupDeviceControls() {
    // Trang 1 - TV
    const tvSwitch = document.getElementById('tv-switch');
    tvSwitch.addEventListener('change', function() {
        const value = this.checked ? 1 : 0;
        window.setFirebaseValue(window.firebaseRef(window.db, 'Trang1/Control1/TV'), value);
    });

    // Trang 1 - Cửa
    const doorSwitch = document.getElementById('door-switch');
    doorSwitch.addEventListener('change', function() {
        const value = this.checked ? 1 : 0;
        window.setFirebaseValue(window.firebaseRef(window.db, 'Trang1/Control1/Door'), value);
    });

    // Trang 1 - Quạt
    const fanSwitch = document.getElementById('fan-switch');
    const fanLevel = document.getElementById('fan-level');
    const fanLevelDisplay = document.getElementById('fan-level-display');
    
    fanSwitch.addEventListener('change', function() {
        const value = this.checked ? 1 : 0;
        window.setFirebaseValue(window.firebaseRef(window.db, 'Trang1/Control1/Fan'), value);
        fanLevel.disabled = !this.checked;
        updateFanIcon(this.checked ? parseInt(fanLevel.value) : 0);
    });

    fanLevel.addEventListener('input', function() {
        fanLevelDisplay.textContent = this.value;
        updateFanIcon(parseInt(this.value));
    });

    // Trang 2 - Đèn
    const lightSwitch = document.getElementById('light-switch');
    lightSwitch.addEventListener('change', function() {
        const value = this.checked ? 1 : 0;
        window.setFirebaseValue(window.firebaseRef(window.db, 'Trang2/Control2/Lamp'), value);
    });

    // Trang 2 - Máy lạnh
    const acSwitch = document.getElementById('ac-switch');
    const acLevel = document.getElementById('ac-level');
    const acLevelDisplay = document.getElementById('ac-level-display');
    
    acSwitch.addEventListener('change', function() {
        const value = this.checked ? 1 : 0;
        window.setFirebaseValue(window.firebaseRef(window.db, 'Trang2/Control2/AirC'), value);
        acLevel.disabled = !this.checked;
        updateACIcon(this.checked ? parseInt(acLevel.value) : 0);
    });

    acLevel.addEventListener('input', function() {
        acLevelDisplay.textContent = this.value;
        updateACIcon(parseInt(this.value));
    });

    // Trang 2 - Loa
    const speakerSwitch = document.getElementById('speaker-switch');
    speakerSwitch.addEventListener('change', function() {
        const value = this.checked ? 1 : 0;
        window.setFirebaseValue(window.firebaseRef(window.db, 'Trang2/Control2/Speaker'), value);
    });
}

// Thiết lập nút khẩn cấp
function setupEmergencyButton() {
    const emergencyBtn = document.getElementById('emergency-button');
    const emergencyStatus = document.getElementById('emergency-status');
    
    emergencyBtn.addEventListener('click', function() {
        emergencyActive = !emergencyActive;
        const value = emergencyActive ? 1 : 0;
        window.setFirebaseValue(window.firebaseRef(window.db, 'Trang2/Control2/Emergency'), value);
    });
}

// Cập nhật biểu tượng quạt dựa trên cấp độ
function updateFanIcon(level) {
    const fanIcon = document.getElementById('fan-icon');
    
    if (level === 0) {
        fanIcon.src = 'image_iot/pc-fan.png';
    } else if (level === 1) {
        fanIcon.src = 'image_iot/openFan.gif';
    } else if (level === 2) {
        fanIcon.src = 'image_iot/fanLV2.gif';
    } else if (level === 3) {
        fanIcon.src = 'image_iot/fanLV3.gif';
    }
}

// Cập nhật biểu tượng máy lạnh dựa trên cấp độ
function updateACIcon(level) {
    const acIcon = document.getElementById('ac-icon');
    
    if (level === 0) {
        acIcon.src = 'image_iot/AirC.png';
    } else if (level === 1) {
        acIcon.src = 'image_iot/AirCLV1.png';
    } else if (level === 2) {
        acIcon.src = 'image_iot/AirCLV2.gif';
    } else if (level === 3) {
        acIcon.src = 'image_iot/AirCLV3.gif';
    }
}

// Phát âm thanh khẩn cấp
function playEmergencySound() {
    try {
        emergencySound.currentTime = 0;
        emergencySound.loop = true;
        emergencySound.play().catch(error => {
            console.warn("Không thể tự động phát âm thanh, có thể cần tương tác người dùng:", error);
        });
    } catch (error) {
        console.error("Không thể phát âm thanh khẩn cấp:", error);
    }
}

// Dừng âm thanh khẩn cấp
function stopEmergencySound() {
    try {
        emergencySound.pause();
        emergencySound.currentTime = 0;
    } catch (error) {
        console.error("Không thể dừng âm thanh khẩn cấp:", error);
    }
}

// Thiết lập chọn phòng
function setupRoomSelection() {
    const roomButtons = document.querySelectorAll('.room-button');
    
    roomButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Xóa class active khỏi tất cả các nút
            roomButtons.forEach(btn => btn.classList.remove('active'));
            
            // Thêm class active vào nút được click
            this.classList.add('active');
            
            // Cập nhật phòng hiện tại
            currentRoom = `Phong${this.dataset.room}`;
            document.getElementById('current-room-name').textContent = `Phòng ${this.dataset.room}`;

            // Gọi lại dữ liệu từ Firebase cho phòng mới
            const roomRef = window.firebaseRef(window.db, `Trang2/${currentRoom}`);
            window.onFirebaseValue(roomRef, (snapshot) => {
                const roomData = snapshot.val();
                if (roomData) {
                    const temp = parseFloat(roomData.Temperature) || 0;
                    const humidity = parseFloat(roomData.Humidity) || 0;
                    const co2 = parseFloat(roomData.Co2) || 0;

                    document.getElementById('bedroom-temp').textContent = `${temp}°C`;
                    document.getElementById('bedroom-humidity').textContent = `${humidity}%`;
                    document.getElementById('bedroom-co2').textContent = `${co2}ppm`;

                    // Cập nhật icon ngay lập tức
                    updateStatusIcons(temp, humidity, co2);
                    
                    // Cập nhật biểu đồ
                    updateChartData(temp, humidity);
                }
            });
            
            // Cập nhật biểu đồ CO2 cho phòng mới
            updateCO2Chart(parseInt(this.dataset.room));
        });
    });
}

// Cập nhật dữ liệu biểu đồ nhiệt độ và độ ẩm
function updateChartData(temp, humidity) {
    const chart = Chart.getChart('environmentChart');
    if (chart) {
        // Thêm dữ liệu mới
        const newTemp = parseFloat(temp) || 0;
        const newHumidity = parseFloat(humidity) || 0;
        
        // Xóa dữ liệu cũ nhất
        temperatureData.shift();
        humidityData.shift();
        timeLabels.shift();
        
        // Thêm dữ liệu mới nhất
        const now = new Date();
        const currentTime = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        temperatureData.push(newTemp);
        humidityData.push(newHumidity);
        timeLabels.push(currentTime);
        
        // Cập nhật biểu đồ
        chart.data.labels = timeLabels;
        chart.data.datasets[0].data = temperatureData;
        chart.data.datasets[1].data = humidityData;
        chart.update();
    }
}

// Khởi tạo biểu đồ bằng Chart.js
function initChart() {
    const ctx = document.getElementById('environmentChart').getContext('2d');
    
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [
                {
                    label: 'Nhiệt độ (°C)',
                    data: temperatureData,
                    borderColor: '#ff6384',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Độ ẩm (%)',
                    data: humidityData,
                    borderColor: '#36a2eb',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    min: 0,
                    max: 100,
                    ticks: {
                        font: {
                            size: 8
                        }
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 8
                        },
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: {
                            size: 10
                        },
                        boxWidth: 12,
                        padding: 5
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    bodyFont: {
                        size: 10
                    },
                    titleFont: {
                        size: 10
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            elements: {
                point: {
                    radius: 2,
                    hoverRadius: 4
                },
                line: {
                    borderWidth: 1.5
                }
            }
        }
    });
}

// Hàm khởi tạo biểu đồ CO2
function initCO2Chart() {
    const ctx = document.getElementById('co2Chart').getContext('2d');
    
    const chart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['8h', '10h', '12h', '14h', '16h', '18h', '20h'],
            datasets: [{
                data: [400, 600, 800, 1200, 900, 700, 500],
                backgroundColor: [
                    '#4bc0c0',
                    '#36a2eb',
                    '#ffcd56',
                    '#ff6384',
                    '#9966ff',
                    '#ff9f40',
                    '#8ac24a'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        font: {
                            size: 10
                        },
                        boxWidth: 12,
                        padding: 10
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${context.raw}ppm`;
                        }
                    },
                    bodyFont: {
                        size: 10
                    }
                }
            }
        }
    });
    
    // Lưu biểu đồ vào biến toàn cục để cập nhật sau này
    window.co2Chart = chart;
}

function updateCO2Chart(roomNumber) {
    if (window.co2Chart) {
        // Tạo dữ liệu CO2 khác nhau cho mỗi phòng
        const baseCO2 = [400, 600, 800, 1200, 900, 700, 500];
        const roomMultiplier = [1, 1.2, 1.5][roomNumber - 1];
        
        const newData = baseCO2.map(value => Math.round(value * roomMultiplier));
        
        window.co2Chart.data.datasets[0].data = newData;
        window.co2Chart.update();
    }
}

function updateStatusIcons(temp, humidity, co2) {
    // Chuyển đổi sang number để so sánh
    temp = parseFloat(temp);
    humidity = parseFloat(humidity);
    co2 = parseFloat(co2);

    // Cập nhật icon nhiệt độ
    const tempIcon = document.getElementById('temp-icon');
    if (temp > 40) {
        tempIcon.src = 'image_iot/tempon.gif';
        tempIcon.classList.add('icon-warning');
    } else {
        tempIcon.src = 'image_iot/temp1.png';
        tempIcon.classList.remove('icon-warning');
    }

    // Cập nhật icon độ ẩm
    const humidityIcon = document.getElementById('humidity-icon');
    if (humidity > 50) {
        humidityIcon.src = 'image_iot/humon.gif';
        humidityIcon.classList.add('icon-warning');
    } else {
        humidityIcon.src = 'image_iot/humoff.png';
        humidityIcon.classList.remove('icon-warning');
    }

    // Cập nhật icon CO2
    const co2Icon = document.getElementById('co2-icon');
    if (co2 > 2000) {
        co2Icon.src = 'image_iot/co2on.gif';
        co2Icon.classList.add('icon-warning');
    } else {
        co2Icon.src = 'image_iot/co2off.png';
        co2Icon.classList.remove('icon-warning');
    }
}