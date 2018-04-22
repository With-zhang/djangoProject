# encoding:utf-8
from django.shortcuts import render, get_object_or_404
from django.http import HttpResponse
from django.template import loader
from django.core.paginator import Paginator
from django.db import connection
import re

def one(request):
    template = loader.get_template(r'myApp/index.html')
    # template = loader.get_template(r'C:/Users/zhang/Desktop/20171013021024.html')
    context = {
        'tnames' : ['a','b']
    }
    return HttpResponse(template.render(context,request))