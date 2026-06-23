import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch'; // or use native fetch if node 18+

async function testUpload() {
  // create dummy image
  fs.writeFileSync('dummy.jpg', 'dummy content');
  
  const form = new FormData();
  form.append('mealImage', fs.createReadStream('dummy.jpg'));
  form.append('mealType', 'lunch');

  try {
    const res = await fetch('http://localhost:5000/CapturedImage', {
      method: 'POST',
      body: form,
      headers: {
        'firebase-uid': 'dummy-uid-123',
        ...form.getHeaders()
      }
    });

    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
  } catch (e) {
    console.error("Error:", e);
  }
}

testUpload();
