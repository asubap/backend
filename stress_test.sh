#!/bin/bash

# Replace with your actual authorization token
TOKEN="eyJhbGciOiJIUzI1NiIsImtpZCI6InEvSXoxMWpvWFdJd1ZqVkMiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3B0Y2hydGJveXpiZ2d1Zm91aHh5LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJjNGE5ZDQzMi0yYmYxLTQ0ZjMtYjc3YS1iZjE5YTQyZjBiYzAiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzQ2NDAwMjA5LCJpYXQiOjE3NDYzOTY2MDksImVtYWlsIjoiYWJoYXZlYWJoaWxhc2hAZ21haWwuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJnb29nbGUiLCJwcm92aWRlcnMiOlsiZ29vZ2xlIl19LCJ1c2VyX21ldGFkYXRhIjp7ImF2YXRhcl91cmwiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NLU0RfWEZvWWp5RlduOUFQcmtwZkhJbHFhMjVaQlN0SDFpalR1a25ST1BxRnhHdzZRSD1zOTYtYyIsImVtYWlsIjoiYWJoYXZlYWJoaWxhc2hAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZ1bGxfbmFtZSI6IkFiaGF2ZSBBYmhpbGFzaCIsImlzcyI6Imh0dHBzOi8vYWNjb3VudHMuZ29vZ2xlLmNvbSIsIm5hbWUiOiJBYmhhdmUgQWJoaWxhc2giLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NLU0RfWEZvWWp5RlduOUFQcmtwZkhJbHFhMjVaQlN0SDFpalR1a25ST1BxRnhHdzZRSD1zOTYtYyIsInByb3ZpZGVyX2lkIjoiMTAzNjkzNDAzNTU1ODkyNDE3ODQ2Iiwic3ViIjoiMTAzNjkzNDAzNTU1ODkyNDE3ODQ2In0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoib2F1dGgiLCJ0aW1lc3RhbXAiOjE3NDYzOTY2MDl9XSwic2Vzc2lvbl9pZCI6ImYwNzYzZjMxLTAxMGQtNGIyMC04OTI4LWZjM2MyZjdlMGRjZSIsImlzX2Fub255bW91cyI6ZmFsc2V9.ALmfu_xFthRJFQZk6AfGbk9lJ3Z0s8EY2YXUXN9DsQo"

# Function to generate random email
generate_random_email() {
    local random_string=$(openssl rand -hex 8)
    echo "user_${random_string}@example.com"
}

# Function to make a single request
make_request() {
    local request_num=$1
    local start_time=$(date +%s.%N)
    
    # Generate random email
    local random_email=$(generate_random_email)
    
    # Create JSON payload with role set to general-member
    local json_payload="{\"user_email\":\"$random_email\",\"role\":\"general-member\"}"
    
    response=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -X POST \
        -d "$json_payload" \
        http://localhost:3000/users/delete-user)
    
    local status_code=$(echo "$response" | tail -n1)
    local response_body=$(echo "$response" | sed '$d')
    local end_time=$(date +%s.%N)
    local duration=$(echo "$end_time - $start_time" | bc)
    
    echo "Request $request_num:"
    echo "Email: $random_email"
    echo "Status: $status_code"
    echo "Response: $response_body"
    echo "Time taken: $duration seconds"
    echo "----------------------------------------"
}

# Make 10 concurrent requests
for i in {1..10}; do
    make_request $i &
done

# Wait for all background processes to complete
wait

echo "All requests completed!" 