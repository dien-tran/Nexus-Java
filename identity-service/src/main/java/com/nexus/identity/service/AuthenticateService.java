package com.nexus.identity.service;

import java.text.ParseException;

import com.nexus.identity.dto.request.AuthenticationRequest;
import com.nexus.identity.dto.request.VerifyTokenRequest;
import com.nexus.identity.dto.response.AuthenticationResponse;
import com.nexus.identity.dto.response.VerifyTokenResponse;
import com.nimbusds.jose.JOSEException;

public interface AuthenticateService {
    AuthenticationResponse authenticated(AuthenticationRequest request);

    VerifyTokenResponse verifyToken(VerifyTokenRequest request) throws JOSEException, ParseException;
}
