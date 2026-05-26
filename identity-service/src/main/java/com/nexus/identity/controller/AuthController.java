package com.nexus.identity.controller;

import java.text.ParseException;

import com.nexus.common.dto.ApiResponse;
import com.nexus.identity.dto.request.AuthenticationRequest;
import com.nexus.identity.dto.request.VerifyTokenRequest;
import com.nexus.identity.dto.response.AuthenticationResponse;
import com.nexus.identity.dto.response.VerifyTokenResponse;
import com.nexus.identity.service.AuthenticateService;
import com.nimbusds.jose.JOSEException;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AuthController {

    AuthenticateService authenticateService;

    @PostMapping("/login")
    public ApiResponse<AuthenticationResponse> authenticate(@RequestBody AuthenticationRequest request) {
        AuthenticationResponse response = authenticateService.authenticated(request);
        return ApiResponse.<AuthenticationResponse>builder()
                .code("200")
                .message("Success")
                .result(response)
                .build();
    }

    @PostMapping("/verify")
    public ApiResponse<VerifyTokenResponse> verification(@RequestBody VerifyTokenRequest request)
            throws JOSEException, ParseException {
        VerifyTokenResponse response = authenticateService.verifyToken(request);
        return ApiResponse.<VerifyTokenResponse>builder()
                .code("200")
                .message("Success")
                .result(response)
                .build();
    }
}
