# 이미지 안경 감지 및 자동 크롭 프로젝트

이 프로젝트는 지정된 폴더에 있는 이미지에서 안경 또는 선글라스를 자동으로 감지하고, 감지된 객체를 중심으로 이미지를 정사각형으로 잘라 저장합니다.

## 주요 기능

- Google Cloud Vision API를 사용하여 이미지 내 객체 감지
- 'Glasses' 또는 'Sunglasses'로 인식된 객체 필터링
- 감지된 객체 중 가장 신뢰도 높은 객체를 기준으로 이미지 크롭
- 객체 비율에 맞춰 크롭 영역 자동 조절
- 처리된 이미지를 별도의 폴더에 저장

## 사전 요구 사항

- [Node.js](https://nodejs.org/) (v14 이상 권장)
- npm (Node.js 설치 시 함께 설치됨)
- Google Cloud Platform 계정 및 Vision API 활성화

## 설정 방법

1.  **프로젝트 클론**

    ```bash
    git clone https://github.com/your-username/image_crop.git
    cd image_crop
    ```

2.  **의존성 설치**

    프로젝트에 필요한 라이브러리를 설치합니다.

    ```bash
    npm install
    ```

3.  **Google Cloud Vision API 설정**

    - Google Cloud Platform에서 새 프로젝트를 생성하거나 기존 프로젝트를 선택합니다.
    - Vision API를 활성화합니다.
    - [서비스 계정 키 생성](https://cloud.google.com/vision/docs/setup#creating-a-service-account) 페이지의 안내에 따라 서비스 계정을 만들고 JSON 키 파일을 다운로드합니다.
    - 다운로드한 JSON 파일의 이름을 `key.json`으로 변경하고 프로젝트의 루트 디렉토리에 위치시킵니다.

## 사용 방법

1.  **이미지 준비**

    프로젝트 내의 `inputs` 폴더에 처리하고자 하는 이미지 파일(JPG, JPEG, PNG)을 넣습니다.

2.  **스크립트 실행**

    다음 명령어를 사용하여 이미지 처리를 시작합니다.

    ```bash
    node index.js
    ```

3.  **결과 확인**

    처리가 완료되면 `outputs` 폴더에 잘라낸 이미지들이 원본과 동일한 파일 이름으로 저장됩니다.

## 설정 변경

`index.js` 파일 상단의 `CONFIGURATION` 섹션에서 일부 설정을 변경할 수 있습니다.

- `OBJECT_RATIO`: 감지된 객체의 크기를 기준으로 얼마나 넓게 이미지를 잘라낼지 결정하는 비율입니다. 기본값은 `80`이며, 값이 작을수록 더 넓은 영역을 포함합니다.
