const cloudinary = require('cloudinary').v2;

// 1. Configure Cloudinary
cloudinary.config({
  cloud_name: 'dtfmjwofq',
  api_key: '593663758738956',
  api_secret: 'v-zGzIJq-Nbc6Q1N5ylRw8NdNVA'
});

async function run() {
  try {
    // 2. Upload an image
    console.log('Uploading sample image...');
    const uploadResult = await cloudinary.uploader.upload('https://res.cloudinary.com/demo/image/upload/sample.jpg', {
      public_id: 'dashboard_sample_image'
    });
    
    console.log('--- Upload Successful ---');
    console.log('Secure URL:', uploadResult.secure_url);
    console.log('Public ID:', uploadResult.public_id);

    // 3. Get image details
    console.log('\n--- Image Metadata ---');
    const details = await cloudinary.api.resource(uploadResult.public_id);
    console.log('Width:', details.width);
    console.log('Height:', details.height);
    console.log('Format:', details.format);
    console.log('File size (bytes):', details.bytes);

    // 4. Transform the image
    // f_auto: Automatically selects the most efficient image format based on the browser.
    // q_auto: Automatically adjusts compression to reduce file size without losing visible quality.
    const transformedUrl = cloudinary.url(uploadResult.public_id, {
      fetch_format: 'auto',
      quality: 'auto'
    });

    console.log('\n--- Transformation ---');
    console.log('Done! Click link below to see optimized version of the image. Check the size and the format.');
    console.log(transformedUrl);

  } catch (error) {
    console.error('Error occurred:', error);
  }
}

run();
