# Image Glasses Detection and Auto-Cropping Project

This project automatically detects glasses or sunglasses in images from a specified folder, crops the image into a square centered on the detected object, and saves it.

## Key Features

- Detects objects in images using the Google Cloud Vision API.
- Filters for objects identified as 'Glasses' or 'Sunglasses'.
- Crops the image based on the detected object with the highest confidence score.
- Automatically adjusts the crop area based on the object ratio.
- Saves the processed images to a separate folder.

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher recommended)
- npm (installed with Node.js)
- Google Cloud Platform account with the Vision API enabled.

## Setup

1.  **Clone the project**

    ```bash
    git clone https://github.com/your-username/image_crop.git
    cd image_crop
    ```

2.  **Install dependencies**

    Install the necessary libraries for the project.

    ```bash
    npm install
    ```

3.  **Set up Google Cloud Vision API**

    - Create a new project or select an existing one in the Google Cloud Platform.
    - Enable the Vision API.
    - Follow the instructions on the [Create a service account key](https://cloud.google.com/vision/docs/setup#creating-a-service-account) page to create a service account and download the JSON key file.
    - Rename the downloaded JSON file to `key.json` and place it in the project's root directory.

## Usage

1.  **Prepare images**

    Place the image files (JPG, JPEG, PNG) you want to process in the `inputs` folder within the project.

2.  **Run the script**

    Use the following command to start image processing.

    ```bash
    node index.js
    ```

3.  **Check the results**

    Once processing is complete, the cropped images will be saved in the `outputs` folder with the same file names as the originals.

## Configuration

You can change some settings in the `CONFIGURATION` section at the top of the `index.js` file.

- `OBJECT_RATIO`: This is the ratio that determines how wide the image will be cropped based on the size of the detected object. The default value is `80`; a smaller value will include a wider area.
