package com.example.demo.ldap.entity;

import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "ldap_settings")
@Getter
@Setter
public class LdapSettings extends BaseEntity {

    @Column(name = "ldap_server")
    private String ldapServer = "ldap://127.0.0.1:389";

    @Column(name = "bind_dn")
    private String bindDn = "cn=admin,dc=horilla,dc=com";

    @Column(name = "bind_password")
    private String bindPassword;

    @Column(name = "base_dn")
    private String baseDn = "ou=users,dc=horilla,dc=com";
}
