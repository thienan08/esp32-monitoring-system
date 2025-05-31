#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <LiquidCrystal_I2C.h>

#define DHTTYPE DHT22

DHT dht1(15, DHTTYPE);  // Trang 1
DHT dht2(13, DHTTYPE);  // Phòng 1
DHT dht3(12, DHTTYPE);  // Phòng 2
DHT dht4(14, DHTTYPE);  // Phòng 3

#define MQ2_1 32  // Phòng 1
#define MQ2_2 35  // Phòng 2
#define MQ2_3 34  // Phòng 3

#define BUTTON_PIN 19
LiquidCrystal_I2C lcd(0x27, 16, 2);

const char* ssid = "Wokwi-GUEST";
const char* password = "";

String firebaseHost = "https://tt-iotcuoiky-default-rtdb.firebaseio.com/";

int screen = 0;                  // Màn hình hiển thị
int prevScreen = 0;             // Màn hình trước đó
bool isEmergency = false;       // Trạng thái cảnh báo
unsigned long lastDebounce = 0;
unsigned long lastUpdateFirebase = 0;
const unsigned long updateInterval = 5000;

void sendAllToFirebase(float t1, float h1, float t2, float h2, int gas2,
                       float t3, float h3, int gas3, float t4, float h4, int gas4,
                       bool emergency);

void displayTrang1(float t, float h);
void displayPhong(int phong, float t, float h, int gas);

void setup() {
  Serial.begin(115200);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  dht1.begin(); dht2.begin(); dht3.begin(); dht4.begin();
  pinMode(MQ2_1, INPUT); pinMode(MQ2_2, INPUT); pinMode(MQ2_3, INPUT);
  lcd.init(); lcd.backlight();

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" connected");
}

void loop() {
  // Đọc nút nhấn chuyển màn hình
  if (digitalRead(BUTTON_PIN) == LOW && millis() - lastDebounce > 300) {
    screen = (screen + 1) % 4;
    lastDebounce = millis();
  }

  // Đọc cảm biến
  float t1 = dht1.readTemperature();
  float h1 = dht1.readHumidity();

  float t2 = dht2.readTemperature();
  float h2 = dht2.readHumidity();
  int gas2 = analogRead(MQ2_1);

  float t3 = dht3.readTemperature();
  float h3 = dht3.readHumidity();
  int gas3 = analogRead(MQ2_2);

  float t4 = dht4.readTemperature();
  float h4 = dht4.readHumidity();
  int gas4 = analogRead(MQ2_3);

  // Kiểm tra Emergency
  bool currentEmergency = false;
  int emergencyRoom = -1;
  if (t2 > 60 || h2 > 70 || gas2 > 2000) { currentEmergency = true; emergencyRoom = 1; }
  else if (t3 > 60 || h3 > 70 || gas3 > 2000) { currentEmergency = true; emergencyRoom = 2; }
  else if (t4 > 60 || h4 > 70 || gas4 > 2000) { currentEmergency = true; emergencyRoom = 3; }

  // Gửi dữ liệu lên Firebase mỗi 5s
  if (millis() - lastUpdateFirebase > updateInterval) {
    sendAllToFirebase(t1, h1, t2, h2, gas2, t3, h3, gas3, t4, h4, gas4, currentEmergency);
    lastUpdateFirebase = millis();
  }

  // Điều khiển màn hình hiển thị
  if (currentEmergency) {
    prevScreen = screen;  // Lưu màn hình trước đó
    displayPhong(emergencyRoom, (emergencyRoom == 1 ? t2 : emergencyRoom == 2 ? t3 : t4),
                                  (emergencyRoom == 1 ? h2 : emergencyRoom == 2 ? h3 : h4),
                                  (emergencyRoom == 1 ? gas2 : emergencyRoom == 2 ? gas3 : gas4));
  } else {
    // Nếu vừa thoát cảnh báo -> quay lại màn hình trước
    if (isEmergency && !currentEmergency) {
      screen = prevScreen;
    }

    switch (screen) {
      case 0: displayTrang1(t1, h1); break;
      case 1: displayPhong(1, t2, h2, gas2); break;
      case 2: displayPhong(2, t3, h3, gas3); break;
      case 3: displayPhong(3, t4, h4, gas4); break;
    }
  }

  isEmergency = currentEmergency; // Cập nhật trạng thái cảnh báo
  delay(300); // Độ trễ nhẹ
}

void displayTrang1(float t, float h) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("T1: "); lcd.print(t); lcd.print(" C");
  lcd.setCursor(0, 1);
  lcd.print("H1: "); lcd.print(h); lcd.print(" %");
}

void displayPhong(int phong, float t, float h, int gas) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.printf("P%d T:%.1fC", phong, t);
  lcd.setCursor(0, 1);
  lcd.printf("H:%.1f%% C:%d", h, gas);
}

void sendAllToFirebase(float t1, float h1, float t2, float h2, int gas2,
                       float t3, float h3, int gas3, float t4, float h4, int gas4,
                       bool emergency) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String base = firebaseHost;

    struct SensorData {
      String url;
      String value;
    } data[] = {
      {base + "/Trang1/Temperature.json", String(t1, 1)},
      {base + "/Trang1/Humidity.json", String(h1, 1)},

      {base + "/Trang2/Phong1/Temperature.json", String(t2, 1)},
      {base + "/Trang2/Phong1/Humidity.json", String(h2, 1)},
      {base + "/Trang2/Phong1/Co2.json", String(gas2)},

      {base + "/Trang2/Phong2/Temperature.json", String(t3, 1)},
      {base + "/Trang2/Phong2/Humidity.json", String(h3, 1)},
      {base + "/Trang2/Phong2/Co2.json", String(gas3)},

      {base + "/Trang2/Phong3/Temperature.json", String(t4, 1)},
      {base + "/Trang2/Phong3/Humidity.json", String(h4, 1)},
      {base + "/Trang2/Phong3/Co2.json", String(gas4)},

      {base + "/Trang2/Control2/Emergency.json", emergency ? "1" : "0"},
    };

    for (auto& d : data) {
      http.begin(d.url);
      http.addHeader("Content-Type", "application/json");
      http.PUT(d.value);
      http.end();
    }

    Serial.println("Firebase updated all sensors + Emergency");
  }
}
