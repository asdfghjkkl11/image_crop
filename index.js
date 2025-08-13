// 필요한 모듈을 가져옵니다.
import { ImageAnnotatorClient } from '@google-cloud/vision'; // Google Cloud Vision API 클라이언트
import sharp from 'sharp'; // 고성능 이미지 처리 라이브러리
import fs from 'fs/promises'; // 비동기 파일 시스템 작업을 위한 모듈
import path from 'path'; // 파일 및 디렉토리 경로 작업을 위한 모듈
import { fileURLToPath } from 'url'; // 파일 URL을 경로 문자열로 변환하는 함수
import { dirname } from 'path'; // 디렉토리 이름을 반환하는 함수
import fsSync from 'fs'; // 동기 파일 시스템 작업을 위한 모듈

// ES 모듈에서 __dirname을 사용하기 위한 Polyfill
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- 설정 ---
const INPUT_DIR = path.join(__dirname, 'inputs'); // 입력 이미지가 있는 디렉토리
const OUTPUT_DIR = path.join(__dirname, 'outputs'); // 처리된 이미지를 저장할 디렉토리
const CREDENTIALS_FILE = 'key.json'; // Google Cloud 인증 정보 파일 이름

const OBJECT_RATIO = 80; // 객체 비율 설정
const MIN_SIZE = 400;
// --- 설정 종료 ---

// 인증 정보 파일이 있는지 확인합니다.
if (!fsSync.existsSync(path.join(__dirname, CREDENTIALS_FILE))) {
  console.error(`\n오류: ${path.join(__dirname, CREDENTIALS_FILE)}에서 인증 정보 파일을 찾을 수 없습니다.`);
  console.error('서비스 계정 키 파일을 생성하려면 설정 지침을 따르세요.');
  process.exit(1); // 파일이 없으면 프로세스를 종료합니다.
}

// Vision API 클라이언트를 생성합니다.
const client = new ImageAnnotatorClient({ keyFilename: path.join(__dirname, CREDENTIALS_FILE) });

/**
 * 단일 이미지를 변환하는 함수입니다.
 * @param {string} relativePath - 입력 디렉토리 기준 상대 경로
 * @param {string} inputPath - 처리할 이미지의 전체 경로
 * @param {string} outputPath - 저장할 이미지의 전체 경로
 */
async function transformImage(relativePath, inputPath, outputPath) {
  console.log(`\n${relativePath} 처리 중...`);

  try {
    // Vision API를 사용하여 이미지에서 객체를 감지합니다.
    const [result] = await client.objectLocalization(inputPath);
    const objects = result.localizedObjectAnnotations;

    if (objects.length > 0) {
      // 가장 높은 신뢰도 점수를 가진 안경 객체를 찾습니다.
      const bestGlasses = objects.reduce((prev, current) => {
        return (prev.score > current.score) ? prev : current;
      });

      console.log(`${relativePath}에서 가장 높은 신뢰도(${bestGlasses.score.toFixed(2)})로 안경을 감지했습니다.`);

      // sharp를 사용하여 이미지를 엽니다.
      const image = sharp(inputPath);
      const metadata = await image.metadata(); // 이미지 메타데이터를 가져옵니다.

      const glasses = bestGlasses;
      const vertices = glasses.boundingPoly.normalizedVertices; // 정규화된 꼭짓점 좌표

      // 정규화된 좌표를 절대 픽셀 값으로 변환합니다.
      const xCoords = vertices.map(v => v.x * metadata.width);
      const yCoords = vertices.map(v => v.y * metadata.height);

      // 경계 상자의 좌표와 크기를 계산합니다.
      const left = Math.min(...xCoords);
      const top = Math.min(...yCoords);
      const width = Math.max(...xCoords) - left;
      const height = Math.max(...yCoords) - top;

      // 설정된 비율에 따라 잘라낼 영역의 크기를 계산합니다.
      const cropWidth = Math.round(width * 100 / OBJECT_RATIO);
      const cropHeight = Math.round(height * 100 / OBJECT_RATIO);
      const outputSize = Math.max(Math.max(cropWidth, cropHeight),MIN_SIZE); // 최종 정사각형 크기

      // 잘라낼 영역의 왼쪽 상단 좌표를 계산합니다.
      let cropLeft = Math.round(left - ((cropWidth - width) / 2));
      let cropTop = Math.round(top - ((cropHeight - height) / 2));

      console.log(cropLeft, cropTop, cropWidth, cropHeight);

      // 이미지를 확장하여 잘라낼 영역이 이미지 경계 내에 있도록 합니다.
      let extended_image = await image
        .clone()
        .extend({
          left: outputSize,
          right: outputSize,
          top: outputSize,
          bottom: outputSize,
          extendWith: 'copy' // 'copy'는 경계를 복사하여 확장합니다.
        })
        .toBuffer();

      // 확장된 이미지에서 최종 이미지를 추출하여 저장합니다.
      await sharp(extended_image).extract({
        left: Math.round(outputSize + cropLeft - ((outputSize - cropWidth) / 2)),
        top: Math.round(outputSize + cropTop - ((outputSize - cropHeight) / 2)),
        width: outputSize,
        height: outputSize
      })
        .toFile(outputPath);

      console.log(` -> 잘라낸 이미지를 ${outputPath}에 저장했습니다.`);
    } else {
      console.log(`${relativePath}에서 안경을 감지하지 못했습니다.`);
    }
  } catch (err) {
    console.error(`${relativePath} 파일 처리 중 Vision API 오류 발생:`, err.message || err);
  }
}

/**
 * 디렉토리 내의 모든 파일을 재귀적으로 찾는 헬퍼 함수입니다.
 * @param {string} dir - 탐색을 시작할 디렉토리 경로
 * @returns {Promise<string[]>} 파일 경로의 배열
 */
async function getFilesRecursive(dir) {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map((dirent) => {
        const res = path.resolve(dir, dirent.name);
        return dirent.isDirectory() ? getFilesRecursive(res) : res;
    }));
    return Array.prototype.concat(...files);
}

/**
 * 입력 디렉토리의 모든 이미지를 로드하고 처리하는 함수입니다.
 */
async function loadImages() {
  console.log('이미지 처리 시작...');

  try {
    // 출력 디렉토리가 없으면 생성합니다.
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    // 재귀적으로 모든 파일을 가져옵니다.
    const allFiles = await getFilesRecursive(INPUT_DIR);

    // 이미지 파일만 필터링합니다. (jpg, jpeg, png)
    const imageFiles = allFiles.filter(f => /\.(jpg|jpeg|png)$/i.test(f));

    if (imageFiles.length === 0) {
      console.log('입력 디렉토리에서 이미지를 찾을 수 없습니다.');
      return;
    }

    console.log(`${imageFiles.length}개의 이미지를 처리합니다.`);

    // 각 이미지 파일에 대해 변환 함수를 호출합니다.
    for (const fullPath of imageFiles) {
      const relativePath = path.relative(INPUT_DIR, fullPath);
      const outputPath = path.join(OUTPUT_DIR, relativePath);

      // 출력 파일의 디렉토리가 존재하지 않으면 생성합니다.
      await fs.mkdir(path.dirname(outputPath), { recursive: true });

      await transformImage(relativePath, fullPath, outputPath);
    }
  } catch (error) {
    console.error('오류가 발생했습니다:', error.message || error);
  }
}

// 이미지 처리 프로세스를 시작합니다.
loadImages().then(() => {
  console.log('\n처리가 완료되었습니다.');
});
