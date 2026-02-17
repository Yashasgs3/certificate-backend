<?php
// Certificate Verification Page
// Connects to Node.js Backend & MongoDB

session_start();

// Get certificate ID from URL
$cert_id = isset($_GET['cert']) ? htmlspecialchars($_GET['cert']) : null;
$certificate_data = null;
$error = null;

if ($cert_id) {
  // Fetch from Node.js backend
  $api_url = "https://certificate-backend-1kcb.onrender.com/api/certificates/verify/" . urlencode($cert_id);
  
  try {
    $response = file_get_contents($api_url);
    if ($response === false) {
      $error = "Certificate not found or backend unavailable";
    } else {
      $data = json_decode($response, true);
      
      if (isset($data['valid']) && $data['valid']) {
        $certificate_data = $data['certificate'];
        
        // Log this view to MongoDB via backend
        $log_data = json_encode([
          'certificateNumber' => $cert_id,
          'viewedAt' => date('Y-m-d H:i:s'),
          'ipAddress' => $_SERVER['REMOTE_ADDR'],
          'userAgent' => $_SERVER['HTTP_USER_AGENT']
        ]);
        
        // Post to backend logging endpoint
        $log_context = stream_context_create([
          'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/json\r\n",
            'content' => $log_data,
            'timeout' => 5
          ]
        ]);
        
        @file_get_contents(
          "https://certificate-backend-1kcb.onrender.com/api/certificates/log-view",
          false,
          $log_context
        );
      } else {
        $error = $data['message'] ?? "Certificate invalid or revoked";
      }
    }
  } catch (Exception $e) {
    $error = "Error fetching certificate: " . $e->getMessage();
  }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certificate Verification</title>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    :root {
      --navy: #0b3d91;
      --yellow: #ffd100;
      --dark: #0b2140;
      --light: #f2f4f8;
    }

    body {
      font-family: 'Roboto', Arial, sans-serif;
      background: linear-gradient(135deg, var(--navy) 0%, var(--dark) 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .container {
      max-width: 600px;
      width: 100%;
    }

    .header {
      text-align: center;
      color: var(--yellow);
      margin-bottom: 30px;
    }

    .header h1 {
      font-size: 32px;
      margin-bottom: 10px;
    }

    .card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      overflow: hidden;
    }

    .card-header {
      background: linear-gradient(135deg, var(--navy) 0%, var(--dark) 100%);
      color: var(--yellow);
      padding: 20px;
      text-align: center;
    }

    .card-header h2 {
      font-size: 24px;
    }

    .card-body {
      padding: 30px 20px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px 0;
      border-bottom: 1px solid #eee;
    }

    .detail-row:last-child {
      border-bottom: none;
    }

    .detail-label {
      font-weight: 600;
      color: var(--navy);
      width: 35%;
    }

    .detail-value {
      color: #333;
      width: 65%;
      text-align: right;
    }

    .status-badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
    }

    .status-active {
      background: #d4edda;
      color: #155724;
    }

    .status-revoked {
      background: #f8d7da;
      color: #721c24;
    }

    .status-expired {
      background: #fff3cd;
      color: #856404;
    }

    .verified-check {
      text-align: center;
      padding: 20px;
      background: #d4edda;
      border-radius: 12px;
      margin-bottom: 20px;
    }

    .verified-check i {
      font-size: 48px;
      color: #28a745;
      display: block;
      margin-bottom: 10px;
    }

    .verified-check p {
      color: #155724;
      font-weight: 600;
    }

    .error-message {
      text-align: center;
      padding: 20px;
      background: #f8d7da;
      border-radius: 12px;
      color: #721c24;
      margin-bottom: 20px;
    }

    .error-message i {
      font-size: 48px;
      display: block;
      margin-bottom: 10px;
    }

    .input-group {
      margin-top: 20px;
      display: flex;
      gap: 10px;
    }

    .input-group input {
      flex: 1;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
    }

    .input-group button {
      padding: 12px 24px;
      background: var(--navy);
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s;
    }

    .input-group button:hover {
      background: var(--dark);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(11, 61, 145, 0.3);
    }

    .footer {
      text-align: center;
      color: var(--yellow);
      margin-top: 30px;
      font-size: 14px;
    }

    .footer a {
      color: var(--yellow);
      text-decoration: none;
    }

    @media (max-width: 600px) {
      .detail-row {
        flex-direction: column;
        align-items: flex-start;
      }

      .detail-value {
        text-align: left;
        width: 100%;
        margin-top: 8px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1><i class="fas fa-certificate"></i></h1>
      <h1>Certificate Verification</h1>
      <p>Broadbeach Online Learning</p>
    </div>

    <!-- Certificate Card -->
    <div class="card">
      <?php if ($error): ?>
        <!-- Error State -->
        <div class="card-body">
          <div class="error-message">
            <i class="fas fa-times-circle"></i>
            <p><?php echo htmlspecialchars($error); ?></p>
          </div>

          <p style="text-align: center; margin-bottom: 20px; color: #666;">
            Enter certificate number to verify:
          </p>

          <form method="GET" style="margin-top: 20px;">
            <div class="input-group">
              <input 
                type="text" 
                name="cert" 
                placeholder="e.g., CERT-FINAL-2026-001"
                value="<?php echo htmlspecialchars($cert_id ?? ''); ?>"
              >
              <button type="submit"><i class="fas fa-search"></i> Verify</button>
            </div>
          </form>
        </div>

      <?php elseif ($certificate_data): ?>
        <!-- Success State -->
        <div class="card-header">
          <i class="fas fa-check-circle" style="font-size: 32px; margin-bottom: 10px;"></i>
          <h2>Certificate Valid</h2>
        </div>

        <div class="card-body">
          <div class="verified-check">
            <i class="fas fa-check-circle"></i>
            <p>This certificate has been verified and is authentically issued by Broadbeach Online.</p>
          </div>

          <!-- Certificate Details -->
          <div class="detail-row">
            <span class="detail-label">Name:</span>
            <span class="detail-value"><strong><?php echo htmlspecialchars($certificate_data['fullName']); ?></strong></span>
          </div>

          <div class="detail-row">
            <span class="detail-label">Course:</span>
            <span class="detail-value"><?php echo htmlspecialchars($certificate_data['courseName']); ?></span>
          </div>

          <div class="detail-row">
            <span class="detail-label">Certificate #:</span>
            <span class="detail-value"><?php echo htmlspecialchars($certificate_data['certificateNumber']); ?></span>
          </div>

          <div class="detail-row">
            <span class="detail-label">Issue Date:</span>
            <span class="detail-value"><?php echo htmlspecialchars($certificate_data['issueDate']); ?></span>
          </div>

          <div class="detail-row">
            <span class="detail-label">Status:</span>
            <span class="detail-value">
              <span class="status-badge status-<?php echo strtolower($certificate_data['status']); ?>">
                <?php echo ucfirst($certificate_data['status']); ?>
              </span>
            </span>
          </div>
        </div>

      <?php else: ?>
        <!-- Initial State (No cert ID) -->
        <div class="card-body" style="text-align: center;">
          <i class="fas fa-qrcode" style="font-size: 64px; color: var(--navy); margin-bottom: 20px; display: block;"></i>
          
          <h3 style="color: var(--navy); margin-bottom: 10px;">Scan QR Code</h3>
          <p style="color: #666; margin-bottom: 20px;">
            Scan the QR code on your certificate to verify its authenticity.
          </p>

          <p style="color: #666; margin-bottom: 20px;">
            Or enter the certificate number below:
          </p>

          <form method="GET">
            <div class="input-group">
              <input 
                type="text" 
                name="cert" 
                placeholder="e.g., CERT-FINAL-2026-001"
                autofocus
              >
              <button type="submit"><i class="fas fa-search"></i> Verify</button>
            </div>
          </form>
        </div>
      <?php endif; ?>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p><i class="fas fa-shield-alt"></i> Secure Verification System - Powered by Broadbeach Online</p>
      <p style="margin-top: 10px;">For inquiries: support@broadbeachonline.com</p>
    </div>
  </div>
</body>
</html>