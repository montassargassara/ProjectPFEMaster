package com.immobilier.backend.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {
    
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final UserDetailsService userDetailsService;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // ✅ OPTIONS toujours permis
                .requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll()
                
                // ── Public routes ────────────────────────────────────────────────────
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/super-admin/init").permitAll()
                .requestMatchers("/api/properties/public/**").permitAll()
                .requestMatchers("/api/images/public/**").permitAll()
                .requestMatchers("/api/videos/public/**").permitAll()
                .requestMatchers("/api/models/public/**").permitAll()
                // Affiliate public registration (creates PENDING account; login blocked until approved)
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/affiliate/register").permitAll()

                // ── Public client auth (register/login open; me requires JWT) ────────
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/client/auth/register").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/client/auth/login").permitAll()
                .requestMatchers("/api/client/auth/**").authenticated()
                .requestMatchers("/api/client/**").hasRole("CLIENT_PUBLIC")

                // ── Super Admin only ─────────────────────────────────────────────────
                .requestMatchers("/api/super-admin/**").hasRole("SUPER_ADMIN")
                .requestMatchers("/api/admin/affiliates/**").hasRole("SUPER_ADMIN")

                // ── Affiliate routes ─────────────────────────────────────────────────
                // Ranking is shared across all roles — must be listed BEFORE the wildcard AFFILIATE rule
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/affiliate/ranking").authenticated()
                .requestMatchers("/api/affiliate/**").hasRole("AFFILIATE")

                // ── Notifications (any authenticated user accesses their own notifications) ──
                .requestMatchers("/api/notifications/**").authenticated()

                // ── Sale offers (mixed roles — method-level @PreAuthorize handles per endpoint) ──
                .requestMatchers("/api/sale-offers/**").authenticated()

                // ── Property management ──────────────────────────────────────────────
                .requestMatchers("/api/properties/**").authenticated()
                .requestMatchers("/api/properties/*/upload-image").authenticated()
                .requestMatchers("/api/properties/*/upload-model").authenticated()
                .requestMatchers("/api/properties/*/media").authenticated()
                .requestMatchers("/api/properties/media/**").authenticated()

                // ── Everything else ──────────────────────────────────────────────────
                .anyRequest().authenticated()
            )
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
    
    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }
    
    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
        
    /**
     * Single source of truth for CORS. ALL controllers must rely on this —
     * no `@CrossOrigin` annotations anywhere, otherwise Spring MVC's CORS
     * handler runs in addition to Spring Security's filter and you end up
     * with duplicated `Access-Control-Allow-Origin` headers (browsers reject
     * the response with "header contains multiple values").
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // Dev front-end origin. Add prod hosts here as needed.
        configuration.setAllowedOrigins(Arrays.asList("http://localhost:4200"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(Arrays.asList(
            "Authorization",
            "Content-Type",
            "Accept",
            "Origin",
            "X-Requested-With"
        ));
        configuration.setExposedHeaders(Arrays.asList("Authorization"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}